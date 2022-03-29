/**
 * @package   mod_athena
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['mod_athena/main', "eth-sig-util"], function(_, EthSigUtil) {
    const init = () => {
        return EthSigUtil;
    };
    return {
        init: init
    };
});