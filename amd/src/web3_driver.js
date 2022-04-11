/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([
    "mod_eductx/web3",
    "mod_eductx/buffer",
    "mod_eductx/ethereumjs_util",
    "mod_eductx/eth_sig_util"
], function(Web3, Buffer, Util, EthSigUtil) {
    const ethSigUtil = EthSigUtil.init();
    const Web3Instance = Web3.init();
    const util = Util.init();
    const buffer = Buffer.init();
    let web3;

    /**
     * Connects to provider
     * @param {function} callback - Callback function to execute
     * @return {Promise<boolean>}
     */
    const connectClientProvider = async(callback) => {
        try {
            await window.ethereum.request({method: 'eth_requestAccounts'});
            web3 = new Web3Instance(window.ethereum);
            callback(true);
        } catch (error) {
            callback(false);
        }
    };

    const getPublicKey = async(callback) => {
        const text = "This message is being signed with purpose of getting public key.";
        const msg = util.bufferToHex(new buffer.Buffer(text, 'utf8'));
        const address = await getAddressInUse();
        const params = [msg, address];
        const method = "personal_sign";
        await web3.currentProvider.sendAsync({
            method,
            params,
            address
        }, (err, res) => {
            if (!err && !res.error) {
                const msgParams = {data: msg, signature: res.result};
                const pubBuffer = buffer.Buffer.from(ethSigUtil.extractPublicKey(msgParams).slice(2), 'hex');
                const pubKey = pubBuffer.toString('hex');
                callback(pubKey);
            }
        });
    };

    /**
     * Returns current provider
     * @return {*}
     */
    const getWeb3Instance = () => {
        return web3;
    };

    /**
     * Resolves to current network in use
     * @return {Number}
     */
    const getNetworkInUse = async() => {
        return await web3.eth.net.getId();
    };

    /**
     * Returns current account (address) in use
     * @return {Promise}
     */
    const getAddressInUse = async() => {
        return (await web3.eth.getAccounts())[0];
    };

    return {
        connectClientProvider,
        getAddressInUse,
        getWeb3Instance,
        getNetworkInUse,
        getPublicKey
    };
})
;