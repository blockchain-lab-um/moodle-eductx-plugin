<?php
/**
 * @package   mod_athena
 * @copyright 2021, Urban Vidovič <urban.vidovic1@student.um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require('../../config.php');
require_once('lib.php');
require_once($CFG->dirroot . "/mod/athena/classes/get_id_class.php");
require_once($CFG->dirroot . "/mod/athena/classes/save_template_class.php");
require_once($CFG->dirroot . "/mod/athena/classes/delete_template_class.php");

$id = optional_param('id', 0, PARAM_INT); // Course Module ID, or ...
$a = optional_param('a',  0, PARAM_INT);  // Athena ID.

if ($id) {
    if (!$cm = get_coursemodule_from_id('athena', $id)) {
        print_error('invalidcoursemodule');
    }
    if (!$course = $DB->get_record('course', array('id' => $cm->course))) {
        print_error('coursemisconf');
    }
} else {
    if (!$athena = $DB->get_record('athena', array('id' => $a))) {
        print_error('invalidathenaid', 'athena');
    }
    if (!$course = $DB->get_record('course', array('id' => $athena->course))) {
        print_error('invalidcourseid');
    }
    if (!$cm = get_coursemodule_from_instance("athena", $athena->id, $course->id)) {
        print_error('invalidcoursemodule');
    }
}

// Check login and get context.
require_login($course, false, $cm);
$context = context_module::instance($cm->id);

$PAGE->requires->js_call_amd('mod_athena/main', 'init');
$PAGE->requires->js_call_amd('mod_athena/buffer', 'init');
$PAGE->requires->js_call_amd('mod_athena/jsonpack', 'init');
$PAGE->requires->js_call_amd('mod_athena/eth_ecies', 'init');
$PAGE->requires->js_call_amd('mod_athena/web3', 'init');
$PAGE->requires->js_call_amd('mod_athena/eth_sig_util', 'init');

$getidform = new get_id_class();
$savetemplateform = new save_template_class();
$deletetemplateform = new delete_template_class();
$formdata = array("id" => $cm->id);
$getidform->set_data($formdata);
$savetemplateform->set_data($formdata);
$deletetemplateform->set_data($formdata);

$PAGE->set_url(new moodle_url('/mod/athena/issue_certificateClass.php'));
$PAGE->set_context(context_system::instance());
$PAGE->set_title('EduCTX - Issue Certificate');
$PAGE->set_heading($course->fullname);

$roleassignments = $DB->get_records("role_assignments", ["userid" => $USER->id]);
$roles = array();

$isauthorized = false;
foreach($roleassignments as $role) {
    $rolefromid = $DB->get_record("role", ["id" => $role->roleid])->shortname;
    // for the sake of one less DB query maybe change comparison from string to int? less robust?
    if (is_siteadmin() || $rolefromid == "editingteacher" || $rolefromid == "coursecreator" || $rolefromid == "teacher" || $rolefromid == "manager") {
        $isauthorized = true;
    }
}

$displayform = false;

$eductxidobj = $DB->get_record("eductxid", ["userid" => $USER->id]);
$eductxid = $eductxidobj->eductxid;
$recordid = $eductxidobj->id;
$PAGE->requires->js_call_amd("mod_athena/ui_driver", "sendIdToJs", [$eductxid]);
$PAGE->requires->js_call_amd("mod_athena/ui_driver", "sendUnitIdToJs", [$course->id]);

if ($fromform = $getidform->get_data()) {
    $eductxidfromform = $fromform->eductxid;
    $eductxidobj = new stdClass();
    $eductxidobj->userid = $USER->id;
    $eductxidobj->eductxid = $eductxidfromform;
    if ($eductxid == NULL) {
        $DB->insert_record("eductxid", $eductxidobj);
    } else {
        $eductxidobj->id = $recordid;
        $DB->update_record("eductxid", (object)$eductxidobj);
    }
    $PAGE->requires->js_call_amd("mod_athena/ui_driver", "sendIdToJs", [$eductxidfromform]);
    $PAGE->requires->js_call_amd("mod_athena/ui_driver", "updateErrorReporting",
        ["Linking successful", "Address <b>" . $fromform->address . "</b> has been linked to your account", "alert alert-success"]);
}

if ($fromform = $savetemplateform->get_data()) {
    $templateobj = new stdClass();
    $templateobj->teacherid = $USER->id;
    $templateobj->name = $fromform->name;
    $templateobj->certtitle = $fromform->certTitle;
    $templateobj->achievement = $fromform->achievement;
    $templateobj->shortdesc = $fromform->shortDesc;
    $templateobj->type = $fromform->type;
    $templateobj->value = $fromform->value;
    $templateobj->measuringunit = $fromform->measuringUnit;
    $templateobj->descurl = $fromform->descUrl;
    $DB->insert_record("templates", $templateobj);
    $PAGE->requires->js_call_amd("mod_athena/ui_driver", "updateErrorReporting",
        ["Template Saved", "Template <b>" . $fromform->name . "</b> has been saved.", "alert alert-success"]);
}

if ($fromform = $deletetemplateform->get_data()) {
    $DB->delete_records("templates", ["id" => $fromform->deleteId]);
    $PAGE->requires->js_call_amd("mod_athena/ui_driver", "updateErrorReporting",
        ["Template Deleted", "Template <b>" . $fromform->deleteName . "</b> has been deleted.", "alert alert-success"]);
}

$role = "Regular User (Student)";
if ($isauthorized) {
    // TEACHER'S FLOW
    $role = "Certified Authority (Teacher)";
    $students = get_role_users(5, context_course::instance($course->id));
    $eligiblestudents = array();
    $certtemplates = $DB->get_records("templates", ["teacherid" => $USER->id]);
    foreach($students as $student) {
        $eductxidobj = $DB->get_record("eductxid", ["userid" => $student->id]);
        $eductxid = $eductxidobj->eductxid;
        if ($eductxid != NULL) {
            $student->eductxid = $eductxid;
            $eligiblestudents[] = $student;
        }
    }
}

echo $OUTPUT->header();
$templatecontext = (object)[
    "addressPlaceholder" => "0x000000000000000000000000",
    "networkPlaceholder" => "0",
    "students" => array_values($eligiblestudents),
    "courseId" => $course->id,
    "eduCtxId" => $eductxid,
    "titleByRole" => $isauthorized ? "Connect wallet to issue certificates" : "Connect wallet to view your certificates",
    "certTemplates" => array_values($certtemplates),
    "role" => $role
];
echo $OUTPUT->render_from_template("athena/home", $templatecontext);

$getidform->display();
$savetemplateform->display();
$deletetemplateform->display();

$PAGE->requires->js_call_amd('mod_athena/ui_driver', 'initializeEventListeners');

echo $OUTPUT->footer();