<?php

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package   mod_eductx
 * @copyright 2022, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once("$CFG->libdir/formslib.php");

class save_template_class extends moodleform {
    public function definition() {
        global $CFG;
        $mform = $this->_form;
        $mform->addElement("hidden", "id");
        $mform->setType("id", PARAM_INT);
        $attribs = [
            "id" => "saveTemplateForm",
            "hidden" => "true"
        ];
        $mform->updateAttributes($attribs);
        $mform->addElement("text", "name", "Template Name");
        $mform->setType("name", PARAM_TEXT);

        $mform->addElement("text", "title", "Credential title");
        $mform->setType("title", PARAM_TEXT);

        $mform->addElement("text", "achievement", "Credential achievement");
        $mform->setType("achievement", PARAM_TEXT);

        $mform->addElement("text", "wasAwardedBy", "Portable unique identifier of the awarding process");
        $mform->setType("wasAwardedBy", PARAM_TEXT);

        $mform->addElement("text", "awardingDate", "Date when the award was issued");
        $mform->setType("awardingDate", PARAM_TEXT);

        $mform->addElement("text", "location", "Location where the award was issued");
        $mform->setType("location", PARAM_TEXT);

        $mform->addElement("text", "courseName", "Name of the course");
        $mform->setType("courseName", PARAM_TEXT);

        $mform->addElement("text", "grade", "Final grade");
        $mform->setType("grade", PARAM_TEXT);

        $mform->addElement("text", "awardingBodyDescription", "Measuring Unit");
        $mform->setType("awardingBodyDescription", PARAM_TEXT);

        $mform->addElement("text", "ects", "ECTS Value");
        $mform->setType("ects", PARAM_TEXT);

        $this->add_action_buttons(false, "Save Template");
    }
}
