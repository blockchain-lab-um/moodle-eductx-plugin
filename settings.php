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
 * Administration settings definitions for the quiz module.
 *
 * @package   mod_eductx
 * @copyright 2023 Urban Vidovič
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    $issuer = new admin_setting_configtext('eductx/issuerendpoint',
        // FIXME: get_string('issuerendpoint', 'eductx'), get_string('configrequiresubnet', 'eductx') should be used in the line below
        "Issuer Endpoint", "URL to be used when making API calls to the issuer server",
        'http://localhost:3001', PARAM_TEXT);

    $apikey = new admin_setting_configtext('eductx/apikey',
        // FIXME: same here as previous fixme
        "API Key", "API Key needed to authenticate with issuer server",
        'YzRiNWQ3Y2UtMDhkYS00MGVmLWE4ZTUtMzA5ZTYwZWU4MDE2', PARAM_TEXT);
    $settings->add($issuer);
    $settings->add($apikey);
}
