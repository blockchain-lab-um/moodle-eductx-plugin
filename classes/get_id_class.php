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
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once("$CFG->libdir/formslib.php");

class get_id_class extends moodleform {
    public function definition() {
        global $CFG;
        $mform = $this->_form;
        $mform->addElement("hidden", "id");
        $mform->setType("id", PARAM_INT);
        $attribs = [
            "id" => "getIdForm",
            "hidden" => "true"
        ];
        $mform->updateAttributes($attribs);
        $mform->addElement("text", "eductxid", "EduCTX ID");
        $mform->setType("messagetext", PARAM_NOTAGS);
        $mform->addElement("text", "address", "Address");
        $mform->setType("messagetext", PARAM_NOTAGS);
        $this->add_action_buttons(false, "Connect Wallet");
    }
}