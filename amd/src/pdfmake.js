/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['mod_eductx/main', "pdfmake"], function(_, pdfmake) {
    const init = () => {
        return pdfmake;
    };
    return {
        init: init,
    };
});