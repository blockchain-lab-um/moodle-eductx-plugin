<?php
/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic1@student.um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

function eductx_add_instance($eductx) {
    global $DB;
    $cmid = $eductx->coursemodule;

    // Process the options from the form.
    $eductx->course = "Course";

    // Try to store it in the database.
    $eductx->id = $DB->insert_record('eductx', $eductx);

    return $eductx->id;
}

function eductx_update_instance($eductx) {

}

function eductx_delete_instance($id) {

}