/**
 * @package   mod_athena
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/*eslint-disable no-console*/
define(['mod_athena/main', "jsonpack"], function(_, jsonpack) {
    const init = () => {
        return jsonpack;
    };
    return {
        init: init
    };
});