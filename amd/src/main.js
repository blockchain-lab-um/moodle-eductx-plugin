/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function() {
  const init = () => {
    window.requirejs.config({
      paths: {
        "ethecies": M.cfg.wwwroot + "/mod/eductx/js/eth_ecies.min",
        "buffer": M.cfg.wwwroot + "/mod/eductx/js/buffer.min",
        "web3": M.cfg.wwwroot + "/mod/eductx/js/web3.min",
        "jsonpack": M.cfg.wwwroot + "/mod/eductx/js/jsonpack.min",
        "ethereumjs-util": M.cfg.wwwroot + "/mod/eductx/js/ethereumjs_util.min",
        "eth-sig-util": M.cfg.wwwroot + "/mod/eductx/js/eth_sig_util.min",
        "pdfmake": M.cfg.wwwroot + "/mod/eductx/js/pdfmake.min",
        "qrcode": M.cfg.wwwroot + "/mod/eductx/js/qrcode.min",
        "connector": M.cfg.wwwroot + "/mod/eductx/js/connector.min"
      },
      shim: {
        'ethecies': {exports: 'ecies'},
        'buffer': {exports: 'Buffer'},
        'web3': {exports: 'Web3'},
        'jsonpack': {exports: 'jsonpack'},
        'ethereumjs-util': {exports: 'Util'},
        'eth-sig-util': {exports: 'EthSigUtil'},
        'pdfmake': {exports: 'pdfmake'},
        'qrcode': {exports: 'QRCode'},
        'connector': {exports: 'connector'}
      }
    });
  };
  return {
    init: init
  };
});