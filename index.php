<?php
/**
 * @package   mod_athena
 * @copyright 2021, Urban Vidovič <urban.vidovic1@student.um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once("../../config.php");

$id = required_param("id", PARAM_INT);

if (!$course = $DB->get_record("course", array("id" => $id))) {
    print_error("Course ID is incorrect");
}