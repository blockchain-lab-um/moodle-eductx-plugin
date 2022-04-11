/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([
    "mod_eductx/buffer",
    "mod_eductx/jsonpack",
    "mod_eductx/eth_ecies",
    "mod_eductx/web3_driver",
    "mod_eductx/contract_driver",
], function (Buffer,
             Jpack,
             Ecies,
             w3d,
             cd) {
    // Modules variables
    let web3;
    let registeredUserContract;
    let eduCTXcaContract;
    let eduCTXtokenContract;
    let contractsInitiated = false;

    // Vars passed from server-side
    let moodleEduCtxId;
    let currentUnitId;

    // Module inits
    const buffer = Buffer.init();
    const jpack = Jpack.init();
    const ecies = Ecies.init();

    // Global vars
    let eduCtxId;
    let address;
    let moodleAddress;
    let net;

    // Const data
    const UI = {
        STUDENT: "student",
        AP: "ap",
        AP_NO_REC: "apnorec",
        NONE: "none",
        NOT_IN_SYNC: "unsynced",
        CERT_ISSUED: "certissued"
    };
    const ERROR = {
        INFO: "alert alert-info",
        DANGER: "alert alert-danger",
        SUCCESS: "alert alert-success",
        WARNING: "alert alert-warning"
    };
    const networkData = [
        {
            chainId: "0x7E2",
            chainName: "EduCTX",
            rpcUrls: ["https://bclabum.informatika.uni-mb.si/besu/"],
            nativeCurrency: {
                name: "ETHEREUM",
                symbol: "ETH",
                decimals: 18,
            }
        }
    ];

    /**
     * Initializes event listeners for issue certificate button
     */
    const initializeEventListeners = () => {
        // Connect wallet button
        document.getElementById("connectButton").addEventListener('click', () => {
            w3d.connectClientProvider((success) => {
                if (!success) {
                    updateErrorReporting("Wallet not installed",
                        "Please consider installing <a href='https://metamask.io/'>Metamask</a>.", ERROR.DANGER);
                    return;
                }
                updateCurrentAccountData();
                initializeProviderEventListeners();
            });
        });
        // Issue certificate button
        document.getElementById("issueCertificate").addEventListener('click', () => {
            issueCert();
        });

        // Overwrite account in Moodle DB button
        document.getElementById("useAccountButton").addEventListener("click", () => {
            saveEduCtxIdToDb(eduCtxId);
        });

        // Decrypt certificates button
        document.getElementById("decryptButton").addEventListener("click", () => {
            const privKey = document.getElementById("privKey").value;
            document.getElementById("decryptButton").disabled = true;
            showCertificates(privKey);
        });

        // Issue another certificate button
        document.getElementById("issueAnotherButton").addEventListener("click", () => {
            document.getElementById("issueAnother").hidden = true;
            updateUI(UI.AP);
            updateErrorReporting("", "", ERROR.SUCCESS);
        });

        // Unit ID checkbox disclaimer
        document.getElementById("unitIdDisclaimer").addEventListener("change", (e) => {
            document.getElementById("unitId").disabled = !e.target.checked;
        });

        // Use this account instead checkbox disclaimer
        document.getElementById("useAccountDisclaimer").addEventListener("change", (e) => {
            document.getElementById("useAccountButton").disabled = !e.target.checked;
        });

        // Save template button
        document.getElementById("saveTemplate").addEventListener("click", () => {
            saveTemplateToDb();
        });

        // Update fields on template selection
        document.getElementById("templates").addEventListener('change', (e) => {
            updateFields(JSON.parse(e.target.value));
            document.getElementById("deleteTemplate").disabled = false;
        });

        // Update fields on template selection
        document.getElementById("students").addEventListener('change', (e) => {
            let student = JSON.parse(e.target.value);
            if (student.idnumber !== "") {
                document.getElementById("studentId").value = student.idNumber;
            }
        });

        document.getElementById("deleteTemplate").addEventListener("click", () => {
            deleteTemplate();
        });
    };

    /**
     * Initializes Provider event listeners - network change, account change, connect, disconnect
     */
    const initializeProviderEventListeners = () => {
        if (window.ethereum) {
            window.ethereum.on("connect", () => {
                updateCurrentAccountData();
            });
            // On Provider Account Change
            window.ethereum.on("accountsChanged", (accounts) => {
                if (accounts.length === 0) {
                    document.getElementById("connectButton").hidden = false;
                }
                updateCurrentAccountData();
            });
            // On Provider Network Change
            window.ethereum.on("chainChanged", () => {
                contractsInitiated = false;
                updateCurrentAccountData();
            });
            // On Provider Disconnect
            window.ethereum.on("disconnect", () => {
                updateCurrentAccountData();
            });
        }
    };

    /**
     * Prompts Metamask to confirm transaction and issue certificate to selected user
     * @return {Promise<void>}
     */
    const issueCert = async () => {
        // Get data and prepare object for issue
        address = await w3d.getAddressInUse();
        let dropDown = document.getElementById('students');
        const eduCtxReceiverId = JSON.parse(dropDown.options[dropDown.selectedIndex].value).id;
        const receiverAddress = await registeredUserContract.methods.getAddressById(Number(eduCtxReceiverId)).call();
        let pubKey = await registeredUserContract.methods.getUserPubKeyById(Number(eduCtxReceiverId)).call();
        pubKey = pubKey.substring(2); // Remove trailing 0x

        let cert = await buildJSONCertificateFromFields();
        cert.person.ethAddress = receiverAddress;
        const compressed = jpack.pack(cert).toString();
        const compressedBuf = buffer.Buffer.from(compressed);
        const pubKeyBuf = buffer.Buffer.from(pubKey, 'hex');
        const encrypted = await ecies.encrypt(pubKeyBuf, compressedBuf).toString('hex');
        let certHash = await web3.utils.keccak256(JSON.stringify(cert)).toString('hex');
        certHash = certHash.substring(2); // Remove trailing 0x
        await eduCTXtokenContract.methods.issueCertificateAuthorizedAddress(Number(eduCtxReceiverId), certHash, encrypted)
            .send({from: address}, (err) => {
                if (err) {
                    updateErrorReporting("Issue failed",
                        "Could not issue the certificate", ERROR.DANGER);
                } else {
                    updateErrorReporting("Certificate issued",
                        "The certificate has been successfully issued", ERROR.SUCCESS);
                }
                updateUI(UI.CERT_ISSUED);
            });
    };

    /**
     * Updates user data
     * @return {Promise<void>}
     */
    const updateCurrentAccountData = async () => {
        // Validate network
        if (window.ethereum && window.ethereum.isConnected()) {
            updateUI(UI.NONE);
            net = (await w3d.getNetworkInUse()).toString();
            if (net !== "2018") {
                updateErrorReporting("Wrong network", "Please accept the change in Metamask", ERROR.DANGER);
                document.getElementById("connectButton").hidden = false;
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: networkData,
                });
                return;
            }
        } else {
            // There's no provider detected
            document.getElementById("connectFlow").hidden = false;
            document.getElementById("issueFlow").hidden = true;
            updateErrorReporting("Metamask not installed",
                "Please consider installing <a href='https://metamask.io/'>Metamask</a>", ERROR.DANGER);
            return;
        }
        if (!contractsInitiated) {
            initContracts();
        }
        address = await w3d.getAddressInUse();
        moodleAddress = "";
        if (moodleEduCtxId) {
            moodleAddress = await registeredUserContract.methods.getAddressById(moodleEduCtxId).call();
        }
        if (!address) {
            address = "0x0000000000000000000000000000000000000000";
        }
        web3 = await w3d.getWeb3Instance();
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
            // Provider connected but there's not any accounts
            updateUI(UI.NONE);
            updateErrorReporting("Connect wallet", "Please connect your wallet", ERROR.WARNING);
            return;
        }

        eduCtxId = await registeredUserContract.methods.getIDbyAddress(address).call();
        const isRegistered = await registeredUserContract.methods.isRegisteredUser(eduCtxId).call();
        const isAuthorized = await eduCTXcaContract.methods.isAuthorizedAddress(address).call();

        // User registered on ECTX, but not in Moodle DB, insert ECTX into DB
        if (isRegistered && moodleEduCtxId === null) {
            saveEduCtxIdToDb(eduCtxId); // Submits form
            return;
        }
        // User is registered on both platforms but is currently not using the correct account
        if (eduCtxId !== moodleEduCtxId && moodleEduCtxId !== null) {
            updateUI(UI.NOT_IN_SYNC);
            updateErrorReporting("Connected account not linked to your Moodle account",
                `Currently connected account is not linked to your Moodle account.
                        Please change your account in MetaMask to <b>${moodleAddress}</b>
                        or link the connected account.`, ERROR.WARNING);
            return;
        }

        // User is not registered at all - a case where user's eduCtxId exists in Moodle's DB and not on blockchain
        // should never happen
        if (!isRegistered) {
            // First registration
            handleFirstRegistration();
        } else {
            // Provider and accounts connected
            presentFlow(isAuthorized);
        }
    };

    /**
     * Initialize contracts
     */
    const initContracts = () => {
        cd.initializeContracts();
        registeredUserContract = cd.getContractInstance("registeredUser");
        eduCTXcaContract = cd.getContractInstance("eduCTXca");
        eduCTXtokenContract = cd.getContractInstance("eduCTXtoken");
        contractsInitiated = true;
    };

    /**
     * Presents appropriate flow based on teacher/student
     * @param {bool} isAuthorized - Is user authorized
     */
    const presentFlow = (isAuthorized) => {
        if (isAuthorized) {
            // Can issue certs
            document.getElementById("unitId").value += "/" + address;
            let eligibleStudents = document.getElementById("students");
            if (eligibleStudents.options.length === 0) {
                document.getElementById("issueCertReceiver").hidden = true;
                document.getElementById("receiverHeading").innerHTML = "No eligible receivers found";
                updateUI(UI.AP_NO_REC);
                updateErrorReporting("No receivers", "No eligible receivers found", ERROR.WARNING);
                return;
            }
            updateUI(UI.AP);
        } else {
            // Student
            updateUI(UI.STUDENT);
        }
        updateErrorReporting("", "", ERROR.SUCCESS);
    };

    /**
     * Handles first registration
     */
    const handleFirstRegistration = () => {
        updateUI(UI.NONE);
        updateErrorReporting("Account not registered",
            "Please accept registration in Metamask or switch to your EduCTX Account", ERROR.WARNING);
        eduCtxId = generateId(8);
        w3d.getPublicKey(async (pubKey) => {
            pubKey = "0x" + pubKey;
            updateErrorReporting("Account not registered",
                "After confirmation you will be automatically redirected", ERROR.INFO);
            const result = await registeredUserContract.methods.registerUser(address, pubKey, Number(eduCtxId))
                .send({from: address});
            if (result) {
                // Successful registration to ECTX platform
                saveEduCtxIdToDb(eduCtxId);
            } else {
                updateErrorReporting("Registration failed", "Could not complete registration", ERROR.DANGER);
            }
        });
    };

    /**
     * Fetches and shows current user's certificates
     * @param {string} privKey - Private key to decrypt certs
     */
    const showCertificates = async (privKey) => {
        // Fetch certs
        address = await w3d.getAddressInUse();
        const ciphers = await cd.fetchCertificates(address);
        if (ciphers.length === 0) {
            document.getElementById("viewCertFlow").innerHTML = "<h2>No certificates yet</h2>\n";
            document.getElementById("decryptFlow").hidden = true;
            return;
        }

        const certs = decryptCerts(ciphers, privKey);
        if (!certs) {
            document.getElementById("decryptButton").hidden = false;
            return;
        }
        const certTable = buildCertTable(certs);

        document.getElementById("decryptFlow").hidden = true;
        document.getElementById("viewCertFlow").innerHTML = certTable;
        updateErrorReporting("", "", ERROR.SUCCESS);
    };

    /**
     * Decrypts passed ciphers with passed private key
     * @param {[obj]} ciphers - Ciphers to decrypt
     * @param {string} privKey - Private key
     * @return {[obj]}
     */
    const decryptCerts = (ciphers, privKey) => {
        const privKeyBuffer = buffer.Buffer.from(privKey, "hex");
        let certs = [];
        ciphers.forEach((cipher) => {
            try {
                const packedCertBuf = ecies.decrypt(privKeyBuffer, buffer.Buffer.from(cipher, "hex"));
                const packedCert = buffer.Buffer.from(packedCertBuf, "hex").toString();
                const cert = jpack.unpack(packedCert);
                if (cert.certificate.unitId === currentUnitId + "/" + cert.ca.ethAddress) {
                    certs.push(cert);
                }
            } catch (ex) {
                updateErrorReporting("Could not decrypt certificates",
                    "The private key provided is incorrect", ERROR.DANGER);
                certs = null;
            } finally {
                document.getElementById("decryptButton").disabled = false;
            }
        });
        return certs;
    };

    /**
     * Build HTML table to show certificates
     * @param {[obj]} certs - Certificates to show
     * @return {string}
     */
    const buildCertTable = (certs) => {
        let certTable;
        if (certs.length === 0) {
            certTable = "<h2>No certificates yet</h2>";
        } else {
            certTable = "<h2 id='shownCertsTitle'>Certificates</h2><hr>";
            certTable += "<table class='table'><thead><th>Title</th><th>Achievement</th><th>Type</th><th>Value</th></thead><tbody>";
            certs.forEach((cert) => {
                certTable += "<tr>";
                certTable += `<td>${cert.certificate.unitTitle !== "" ? cert.certificate.unitTitle : "-"}</td>`;
                certTable += `<td>${cert.certificate.certificateTitle !== "" ? cert.certificate.certificateTitle : "-"}</td>`;
                certTable += `<td>${cert.certificate.type !== "" ? cert.certificate.type : "-"}</td>`;
                certTable +=
                    `<td>${cert.certificate.value !== "" ? cert.certificate.value : "-"} ${cert.certificate.unitMeasurement}</td>`;
                certTable += "</tr>";
            });
            certTable += "</tbody></table>";
        }
        return certTable;
    };

    /**
     * Updates certificate fields from saved template
     * @param {obj} template - Certificate fields from template {}
     */
    const updateFields = (template) => {
        document.getElementById("certTitle").value = template.title;
        document.getElementById("achievement").value = template.achievement;
        document.getElementById("certShortDesc").value = template.shortDesc;
        document.getElementById("certType").value = template.type;
        document.getElementById("value").value = template.value;
        document.getElementById("measureUnit").value = template.measuringUnit;
        document.getElementById("descriptionUrl").value = template.descUrl;
    };

    /**
     * Insert eduCtxId into Moodle DB
     * @param {string} eduCtxId
     */
    const saveEduCtxIdToDb = (eduCtxId) => {
        const form = document.getElementById("getIdForm");
        document.getElementById("id_eductxid").value = eduCtxId;
        document.getElementById("id_address").value = address;
        form.submit();
    };

    /**
     * Insert created template into Moodle DB
     */
    const saveTemplateToDb = () => {
        const form = document.getElementById("saveTemplateForm");
        document.getElementById("id_name").value = document.getElementById("templateName").value;
        document.getElementById("id_certTitle").value = document.getElementById("certTitle").value;
        document.getElementById("id_shortDesc").value = document.getElementById("certShortDesc").value;
        document.getElementById("id_achievement").value = document.getElementById("achievement").value;
        document.getElementById("id_type").value = document.getElementById("certType").value;
        document.getElementById("id_value").value = document.getElementById("value").value;
        document.getElementById("id_measuringUnit").value = document.getElementById("measureUnit").value;
        document.getElementById("id_descUrl").value = document.getElementById("descriptionUrl").value;
        form.submit();
    };

    const deleteTemplate = () => {
        const form = document.getElementById("deleteTemplateForm");
        document.getElementById("id_deleteId").value = JSON.parse(document.getElementById("templates").value).id;
        document.getElementById("id_deleteName").value = JSON.parse(document.getElementById("templates").value).name;
        form.submit();
    };

    /**
     * Generates a random n-digit random used for EduCTX ID
     * @param {Number} numOfDigits - Length of generated number
     * @return {string}
     */
    const generateId = (numOfDigits) => {
        let id = '';
        for (let i = 0; i < numOfDigits; i++) {
            let min = (i === 0) ? 1 : 0;
            let max = 9;
            let digit = Math.floor(Math.random() * (max - min + 1) + min);
            id += digit.toString();
        }
        return id;
    };

    /**
     * Updates current UI based on user's account
     * @param {string} option - Enum value
     */
    const updateUI = (option) => {
        if (address) {
            const addrString = address.substring(0, 5) + "..." +
                address.substring(address.length - 4, address.length);
            document.getElementById("addressElement").innerHTML = addrString;
        }
        // Example of getting url of an image with moodle js lib
        const imgSrc =  M.util.image_url("tick", "mod_eductx");
        document.getElementById("networkElement").innerHTML = `<img src="${imgSrc}" alt="conn_success"> Connected to Network`;
        switch (option) {
            case UI.STUDENT:
                document.getElementById("connectFlow").hidden = true;
                document.getElementById("issueFlow").hidden = true;
                document.getElementById("useAccountFlow").hidden = true;
                document.getElementById("viewCertFlow").hidden = false;
                document.getElementById("userData").hidden = false;
                document.getElementById("decryptFlow").hidden = false;
                break;

            case UI.AP:
                document.getElementById("viewCertFlow").hidden = true;
                document.getElementById("useAccountFlow").hidden = true;
                document.getElementById("connectFlow").hidden = true;
                document.getElementById("decryptFlow").hidden = true;
                document.getElementById("issueFlow").hidden = false;
                document.getElementById("userData").hidden = false;
                break;

            case UI.CERT_ISSUED:
                document.getElementById("viewCertFlow").hidden = true;
                document.getElementById("useAccountFlow").hidden = true;
                document.getElementById("connectFlow").hidden = true;
                document.getElementById("decryptFlow").hidden = true;
                document.getElementById("issueFlow").hidden = true;
                document.getElementById("userData").hidden = false;
                document.getElementById("issueAnother").hidden = false;
                break;

            case UI.AP_NO_REC:
                document.getElementById("viewCertFlow").hidden = true;
                document.getElementById("useAccountFlow").hidden = true;
                document.getElementById("connectFlow").hidden = true;
                document.getElementById("decryptFlow").hidden = true;
                document.getElementById("issueFlow").hidden = true;
                document.getElementById("userData").hidden = false;
                break;

            case UI.NONE:
                document.getElementById("viewCertFlow").hidden = true;
                document.getElementById("useAccountFlow").hidden = true;
                document.getElementById("issueFlow").hidden = true;
                document.getElementById("userData").hidden = true;
                document.getElementById("decryptFlow").hidden = true;
                document.getElementById("connectFlow").hidden = false;
                break;

            case UI.NOT_IN_SYNC:
                document.getElementById("decryptFlow").hidden = true;
                document.getElementById("issueFlow").hidden = true;
                document.getElementById("connectFlow").hidden = true;
                document.getElementById("viewCertFlow").hidden = true;
                document.getElementById("useAccountFlow").hidden = false;
                document.getElementById("userData").hidden = false;
                break;

            default:

                break;
        }
    };

    /**
     * Updates error reporting div
     * @param {string} title - Error title
     * @param {string} msg - Error string
     * @param {ERROR} type - Type of error, consts defined above
     */
    const updateErrorReporting = (title, msg, type) => {
        const errorDiv = document.getElementById("errorReporting");
        const errorTitle = document.getElementById("errorTitle");
        const error = document.getElementById("error");
        if (msg === "" && title === "") {
            errorDiv.hidden = true;
            return;
        }
        if (type !== null) {
            errorDiv.className = type;
        } else {
            errorDiv.className = ERROR.INFO;
        }
        errorDiv.hidden = false;
        error.innerHTML = msg;
        errorTitle.innerHTML = title;
    };

    /**
     * Return JSON object, data from input fields
     * @return {Promise<{obj}>}
     */
    const buildJSONCertificateFromFields = async () => {
        let dropDown = document.getElementById('students');
        const eduCtxReceiverData = JSON.parse(dropDown.options[dropDown.selectedIndex].value);
        address = await w3d.getAddressInUse();
        let caAddress = await eduCTXcaContract.methods.getAuthorizedAddressCa(address).call();
        let caMetadata = await eduCTXcaContract.methods.getCaMetaData(caAddress).call();
        return {
            eductxVersion: "2.0",
            timestamp: Date.now().toString(),
            person: {
                id: document.getElementById("studentId").value,
                firstName: eduCtxReceiverData.firstName,
                lastName: eduCtxReceiverData.lastName,
                ethAddress: "",
                eduCTXid: eduCtxReceiverData.id,
            },
            ca: {
                fullName: caMetadata[1],
                logoURI: caMetadata[0],
                ethAddress: address
            },
            certificate: {
                type: document.getElementById("certType").value,
                certificateTitle: document.getElementById("achievement").value,
                unitId: document.getElementById("unitId").value,
                unitTitle: document.getElementById("certTitle").value,
                shortDescription: document.getElementById("certShortDesc").value,
                fullDescriptionURI: document.getElementById("descriptionUrl").value,
                value: document.getElementById("value").value,
                unitMeasurement: document.getElementById("measureUnit").value,
            }
        };
    };

    /**
     * Saves Moodle's user EduCTX ID to a variable in this AMD scope
     * @param {string} id - id to save locally for use with registration
     */
    const sendIdToJs = (id) => {
        moodleEduCtxId = id;
    };

    /**
     * Saves Unit Id to a variable in this AMD scope
     * @param {string} unitId
     */
    const sendUnitIdToJs = (unitId) => {
        currentUnitId = unitId;
    };

    return {
        initializeEventListeners,
        updateCurrentAccountData,
        updateErrorReporting,
        sendIdToJs,
        sendUnitIdToJs
    };
})
;

