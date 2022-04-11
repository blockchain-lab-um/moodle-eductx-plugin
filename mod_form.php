<?php
/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic1@student.um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

if (!defined('MOODLE_INTERNAL')) {
    die('Direct access to this script is forbidden.');    ///  It must be included from a Moodle page
}

require_once($CFG->dirroot.'/course/moodleform_mod.php');
require_once($CFG->dirroot.'/mod/eductx/lib.php');

class mod_eductx_mod_form extends moodleform_mod {

    function definition() {
        global $CFG, $DB, $OUTPUT;

        $mform =& $this->_form;

        $mform->addElement('text', 'name', get_string('pluginname', 'mod_eductx'), array('size'=>'64'));
        $mform->setType('name', PARAM_TEXT);
//        $mform->addRule('name', null, 'required', null, 'client');

        $this->standard_coursemodule_elements();

        $this->apply_admin_defaults();
        $this->add_action_buttons();
    }
}