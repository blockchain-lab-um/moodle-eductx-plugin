<?php
/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require('../../config.php');
require_once('lib.php');
require_once($CFG->dirroot . "/mod/eductx/classes/get_id_class.php");
require_once($CFG->dirroot . "/mod/eductx/classes/save_template_class.php");
require_once($CFG->dirroot . "/mod/eductx/classes/delete_template_class.php");

$id = optional_param('id', 0, PARAM_INT); // Course Module ID, or ...
$a = optional_param('a',  0, PARAM_INT);  // eductx ID.

if ($id) {
    if (!$cm = get_coursemodule_from_id('eductx', $id)) {
        print_error('invalidcoursemodule');
    }
    if (!$course = $DB->get_record('course', array('id' => $cm->course))) {
        print_error('coursemisconf');
    }
} else {
    if (!$eductx = $DB->get_record('eductx', array('id' => $a))) {
        print_error('invalideductxid', 'eductx');
    }
    if (!$course = $DB->get_record('course', array('id' => $eductx->course))) {
        print_error('invalidcourseid');
    }
    if (!$cm = get_coursemodule_from_instance("eductx", $eductx->id, $course->id)) {
        print_error('invalidcoursemodule');
    }
}

// Check login and get context.
require_login($course, false, $cm);
$context = context_module::instance($cm->id);

$PAGE->requires->js_call_amd('mod_eductx/main', 'init');
$PAGE->requires->js_call_amd('mod_eductx/buffer', 'init');
$PAGE->requires->js_call_amd('mod_eductx/jsonpack', 'init');
$PAGE->requires->js_call_amd('mod_eductx/eth_ecies', 'init');
$PAGE->requires->js_call_amd('mod_eductx/web3', 'init');
$PAGE->requires->js_call_amd('mod_eductx/eth_sig_util', 'init');
$PAGE->requires->js_call_amd('mod_eductx/pdfmake', 'init');
$PAGE->requires->js_call_amd('mod_eductx/qrcode', 'init');
$PAGE->requires->js_call_amd('mod_eductx/connector', 'init');

$getidform = new get_id_class();
$savetemplateform = new save_template_class();
$deletetemplateform = new delete_template_class();
$formdata = array("id" => $cm->id);
$getidform->set_data($formdata);
$savetemplateform->set_data($formdata);
$deletetemplateform->set_data($formdata);

$PAGE->set_url(new moodle_url('/mod/eductx/issue_certificateClass.php'));
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

$didobj = $DB->get_record("did", ["userid" => $USER->id]);
$did = $didobj->did;
$recordid = $didobj->id;
$PAGE->requires->js_call_amd("mod_eductx/ui_driver", "sendIdToJs", [$did]);
$PAGE->requires->js_call_amd("mod_eductx/ui_driver", "sendUnitIdToJs", [$course->id]);
$PAGE->requires->js_call_amd("mod_eductx/ui_driver", "sendAuthorizedToJs", [$isauthorized]);

if ($fromform = $getidform->get_data()) {
    $didfromform = $fromform->did;
    $didobj = new stdClass();
    $didobj->userid = $USER->id;
    $didobj->did = $didfromform;
    if ($did == NULL) {
        $DB->insert_record("did", $didobj);
    } else {
        $didobj->id = $recordid;
        $DB->update_record("did", (object)$didobj);
    }
    $PAGE->requires->js_call_amd("mod_eductx/ui_driver", "sendIdToJs", [$didfromform]);
    $PAGE->requires->js_call_amd("mod_eductx/ui_driver", "updateErrorReporting",
        ["Linking successful", "Address <b>" . $fromform->address . "</b> has been linked to your account", "alert alert-success"]);
}

if ($fromform = $savetemplateform->get_data()) {
    $templateobj = new stdClass();
    $templateobj->teacherid = $USER->id;
    $templateobj->name = $fromform->name;
    $templateobj->title = $fromform->title;
    $templateobj->achievement = $fromform->achievement;
    $templateobj->wasawardedby = $fromform->wasAwardedBy;
    $templateobj->grade = $fromform->grade;
    $templateobj->ects = $fromform->ects;
    $templateobj->awardingbodydescription = $fromform->awardingBodyDescription;
    $DB->insert_record("templates", $templateobj);
    $PAGE->requires->js_call_amd("mod_eductx/ui_driver", "updateErrorReporting",
        ["Template Saved", "Template <b>" . $fromform->name . "</b> has been saved.", "alert alert-success"]);
}

if ($fromform = $deletetemplateform->get_data()) {
    $DB->delete_records("templates", ["id" => $fromform->deleteId]);
    $PAGE->requires->js_call_amd("mod_eductx/ui_driver", "updateErrorReporting",
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
        $didobj = $DB->get_record("did", ["userid" => $student->id]);
        $did = $didobj->did;
        if ($did != NULL) {
            $student->did = $did;
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
    "eduCtxId" => $did,
    "titleByRole" => $isauthorized ? "Connect wallet to issue Verifiable Credentials" : "Connect wallet to view claimable Verifiable Credentials",
    "certTemplates" => array_values($certtemplates),
    "role" => $role
];
echo $OUTPUT->render_from_template("eductx/home", $templatecontext);

$getidform->display();
$savetemplateform->display();
$deletetemplateform->display();

$PAGE->requires->js_call_amd('mod_eductx/ui_driver', 'initializeEventListeners');

echo $OUTPUT->footer();