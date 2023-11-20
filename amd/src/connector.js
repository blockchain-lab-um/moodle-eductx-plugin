/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['mod_eductx/main', "connector"], function (_, Masca) {
    const init = () => {
        return Masca;
    };
    return {
        init: init
    };
});