<?php
/**
 * @package   mod_athena
 * @copyright 2021, Urban Vidovič <urban.vidovic1@student.um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

function athena_add_instance($athena) {
    global $DB;
    $cmid = $athena->coursemodule;

    // Process the options from the form.
    $athena->course = "Course";

    // Try to store it in the database.
    $athena->id = $DB->insert_record('athena', $athena);

    return $athena->id;
}

function athena_update_instance($athena) {

}

function athena_delete_instance($id) {

}

function generate_eductx_id($digits) {
    $id = '';
        for ($i = 0; $i < $digits; $i++) {
            $min = ($i == 0) ? 1 : 0;
            $max = 9;
            $digit = rand($min, $max);
            $id .= $digit;
        }
        return $id;
}