/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(["mod_eductx/main",
  "mod_eductx/buffer",
  "mod_eductx/jsonpack",
  "mod_eductx/pdfmake",
  "mod_eductx/eth_ecies",
  "mod_eductx/web3_driver",
  "mod_eductx/contract_driver",
  "mod_eductx/get_pdf_content",
  "mod_eductx/connector"
], function(main, Buffer, Jpack, Pdfmake, Ecies, w3d, cd, pdf, Connector) {
  // Modules variables
  let web3;

  // Vars passed from server-side
  let moodleDid;
  // eslint-disable-next-line no-unused-vars
  let currentUnitId;
  let isAuthorized;

  // Module inits
  // const buffer = Buffer.init();
  // const jpack = Jpack.init();
  // const ecies = Ecies.init();
  const pdfmake = Pdfmake.init();
  const connector = Connector.init();
  let masca;

  // Global vars
  let did;
  let moodleAddress;

  // Const data
  const UI = {
    STUDENT: "student", AP: "ap", AP_NO_REC: "apnorec", NONE: "none", NOT_IN_SYNC: "unsynced", CERT_ISSUED: "certissued"
  };
  const ERROR = {
    INFO: "alert alert-info", DANGER: "alert alert-danger", SUCCESS: "alert alert-success", WARNING: "alert alert-warning"
  };

  /**
   * Initializes event listeners for issue certificate button
   */
  const initializeEventListeners = async() => {
    // Connect Masca button
    document.getElementById("connectButton").addEventListener('click', async() => {
      await w3d.connectClientProvider(async(success) => {
        if (!success) {
          updateErrorReporting("Wallet not installed", "Please consider installing" +
            "<a href='https://metamask.io/'>Metamask</a>.", ERROR.DANGER);
          return;
        }
        initializeProviderEventListeners();
        await initMasca();
        await updateCurrentAccountData();
      });
    });
    // Issue certificate button
    document.getElementById("issueCertificate").addEventListener('click', () => {
      issueCert();
    });

    document.getElementById("refreshCredentials").addEventListener("click", () => {
      showCredentials();
    });

    // Overwrite account in Moodle DB button
    document.getElementById("useAccountButton").addEventListener("click", () => {
      saveDidToDb(did);
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

    // Delete template button
    document.getElementById("deleteTemplate").addEventListener("click", () => {
      deleteTemplate();
    });
  };

  const initMasca = async() => {
    const address = await w3d.getAddressInUse();
    const enableResult = await connector.enableMasca(address, {
      snapId: "npm:@blockchain-lab-um/masca",
      version: "v1.1.0-beta.2",
      supportedMethods: ["did:key"]
    });
    if (connector.isError(enableResult)) {
      // FIXME: This error is shown as [Object object]
      updateErrorReporting("Error connecting Masca", "There has been an error enabling Masca", ERROR.DANGER);
      throw new Error(enableResult.error);
    }
    masca = await enableResult.data.getMascaApi();
    did = (await masca.getDID()).data;
    // eslint-disable-next-line no-unused-vars
    showCredentials();
    updateUI(UI.STUDENT);
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
      window.ethereum.on("accountsChanged", async(accounts) => {
        if (accounts.length === 0) {
          document.getElementById("connectButton").hidden = false;
        }
        const setAccountRes = await masca.setCurrentAccount({
          currentAccount: accounts[0]
        });

        if (connector.isError(setAccountRes)) {
          updateUI();
          return;
        }
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
  const issueCert = async() => {
    // Get data and prepare object for issue
    did = await w3d.getAddressInUse();
    let dropDown = document.getElementById('students');
    const receiverDid = JSON.parse(dropDown.options[dropDown.selectedIndex].value).id;
    // eslint-disable-next-line no-console
    console.log(receiverDid);
    let cert = await buildJSONCertificateFromFields();
    cert.person.ethAddress = receiverDid;
    // TODO: issue VC below
  };

  /**
   * Updates user data
   * @return {Promise<void>}
   */
  const updateCurrentAccountData = async() => {
    // Validate network
    if (window.ethereum && window.ethereum.isConnected()) {
      updateUI(UI.NONE);
    } else {
      // There's no provider detected
      document.getElementById("connectFlow").hidden = false;
      document.getElementById("issueFlow").hidden = true;
      updateErrorReporting("Metamask not installed",
        "Please consider installing <a href='https://metamask.io/'>Metamask</a>", ERROR.DANGER);
      return;
    }
    did = await w3d.getAddressInUse();
    moodleAddress = "";
    if (!did) {
      did = "did:key:waiting";
    }
    web3 = await w3d.getWeb3Instance();
    const accounts = await web3.eth.getAccounts();
    if (accounts.length === 0) {
      // Provider connected but there's not any accounts
      updateUI(UI.NONE);
      updateErrorReporting("Connect wallet", "Please connect your wallet", ERROR.WARNING);
      return;
    }

    did = (await masca.getDID()).data;

    // User registered on ECTX, but not in Moodle DB, insert ECTX into DB
    if (moodleDid === null) {
      saveDidToDb(did); // Submits form
      return;
    }
    // User is registered on both platforms but is currently not using the correct account
    if (did !== moodleDid && moodleDid !== null) {
      updateUI(UI.NOT_IN_SYNC);
      updateErrorReporting("Connected DID not linked to your Moodle account",
        `Currently connected account is not linked to your Moodle account.
                        Please change your account in MetaMask to <b>${moodleAddress}</b>
                        or link the connected account.`, ERROR.WARNING);
      return;
    }

    // User is not registered at all - a case where user's did exists in Moodle's DB and not on blockchain
    // should never happen
    // if (!isRegistered) {
    // First registration
    // handleFirstRegistration();
    // } else {
    // Provider and accounts connected
    presentFlow(isAuthorized);
    // }
  };

  /**
   * Presents appropriate flow based on teacher/student
   * @param {bool} isAuthorized - Is user authorized
   */
  const presentFlow = (isAuthorized) => {
    if (isAuthorized) {
      // Can issue certs
      document.getElementById("unitId").value += "/" + did;
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
   * Fetches and shows current user's certificates
   */
  const showCredentials = async() => {
    // Fetch certs
    did = await w3d.getAddressInUse();
    const vcs = await masca.queryCredentials();
    if (connector.isError(vcs)) {
      updateErrorReporting("Error fetching credentials", "The credentials could not be loaded at the moment.", ERROR.DANGER);
      return;
    }
    if (vcs.data.length === 0) {
      document.getElementById("viewCertFlow").innerHTML = "<h2>No credentials yet</h2>\n";
      return;
    }
    document.getElementById("viewCertFlow").innerHTML = buildCertTable(vcs.data);
    document.querySelectorAll(".export-cert").forEach(btn => {
      btn.addEventListener('click', function() {
        const cert = JSON.parse(this.dataset.cert);
        exportPdf(cert);
      });
    });
    updateErrorReporting("", "", ERROR.SUCCESS);
  };

  /**
   * Build PDF and export the cert
   * @param {obj} certificate - Certificate to build PDF for
   */
  const exportPdf = async(certificate) => {
    // Pdfmake.vfs = Fonts.pdfMake.vfs;
    pdfmake.fonts = {
      Roboto: {
        normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
        bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
        italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
        bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
      },
    };
    const docDefinition = await pdf.getContent(certificate);
    // eslint-disable-next-line no-console
    console.log(docDefinition);
    pdfmake
      .createPdf(docDefinition)
      .download(
        certificate.person.firstName +
        '_' +
        certificate.person.lastName +
        '_' +
        certificate.certificate.unitTitle + ".pdf"
      );

    // eslint-disable-next-line no-console
    console.log(certificate);
  };

  /**
   * Build HTML table to show certificates
   * @param {[obj]} vcs - Certificates to show
   * @return {string}
   */
  const buildCertTable = (vcs) => {
    let credentialsTable;
    if (vcs.length === 0) {
      credentialsTable = "<h2>No credentials yet</h2>";
    } else {
      credentialsTable = "<h2 id='shownCertsTitle'>Certificates</h2><hr>";
      credentialsTable += "<div style=\"overflow-x: scroll;\"><table class='table'>" +
        "<thead><th>Type</th>" + "<th>Issuer</th><th>Type</th><th>Value</th><th></th></thead>" +
        "<tbody>";
      vcs.forEach((cred) => {
        credentialsTable += "<tr>";
        credentialsTable += `<td>${cred.data.type[1] !== "" ? cred.data.type[1] : "-"}</td>`;
        credentialsTable += `<td>${cred.data.issuer !== "" ? cred.data.issuer : "-"}</td>`;
        credentialsTable += `<td></td>`;
        credentialsTable += `<td></td>`;
        credentialsTable += `<td>
                    <button data-cert='${JSON.stringify(cred)}' class="btn btn-primary export-cert">PDF
                    </input>`;
        credentialsTable += "</tr>";
      });
      credentialsTable += "</tbody></table></div>";
    }
    return credentialsTable;
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
   * Insert did into Moodle DB
   * @param {string} receivedDid
   */
  const saveDidToDb = (receivedDid) => {
    const form = document.getElementById("getIdForm");
    document.getElementById("id_did").value = receivedDid;
    document.getElementById("id_address").value = did;
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
   * Updates current UI based on user's account
   * @param {string} option - Enum value
   */
  const updateUI = (option) => {
    if (did) {
      const addrString = did.substring(0, 5) + "..." + did.substring(did.length - 4, did.length);
      document.getElementById("addressElement").innerHTML = addrString;
      document.getElementById("addressElement").innerHTML = did;
    }
    // Example of getting url of an image with moodle js lib
    const imgSrc = M.util.image_url("tick", "mod_eductx");
    document.getElementById("networkElement").innerHTML = `<img src="${imgSrc}" alt="conn_success"> Connected to Network`;
    switch (option) {
      case UI.STUDENT:
        document.getElementById("connectFlow").hidden = true;
        document.getElementById("issueFlow").hidden = true;
        document.getElementById("useAccountFlow").hidden = true;
        document.getElementById("viewCertFlow").hidden = false;
        document.getElementById("userData").hidden = false;
        document.getElementById("refreshCredentials").hidden = false;
        break;

      case UI.AP:
        document.getElementById("viewCertFlow").hidden = true;
        document.getElementById("useAccountFlow").hidden = true;
        document.getElementById("connectFlow").hidden = true;
        document.getElementById("refreshCredentials").hidden = true;
        document.getElementById("issueFlow").hidden = false;
        document.getElementById("userData").hidden = false;
        break;

      case UI.CERT_ISSUED:
        document.getElementById("viewCertFlow").hidden = true;
        document.getElementById("useAccountFlow").hidden = true;
        document.getElementById("connectFlow").hidden = true;
        document.getElementById("refreshCredentials").hidden = true;
        document.getElementById("issueFlow").hidden = true;
        document.getElementById("userData").hidden = false;
        document.getElementById("issueAnother").hidden = false;
        break;

      case UI.AP_NO_REC:
        document.getElementById("viewCertFlow").hidden = true;
        document.getElementById("useAccountFlow").hidden = true;
        document.getElementById("connectFlow").hidden = true;
        document.getElementById("refreshCredentials").hidden = true;
        document.getElementById("issueFlow").hidden = true;
        document.getElementById("userData").hidden = false;
        break;

      case UI.NONE:
        document.getElementById("viewCertFlow").hidden = true;
        document.getElementById("useAccountFlow").hidden = true;
        document.getElementById("refreshCredentials").hidden = true;
        document.getElementById("issueFlow").hidden = true;
        document.getElementById("userData").hidden = true;
        document.getElementById("connectFlow").hidden = false;
        break;

      case UI.NOT_IN_SYNC:
        document.getElementById("issueFlow").hidden = true;
        document.getElementById("refreshCredentials").hidden = true;
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
  const buildJSONCertificateFromFields = async() => {
    let dropDown = document.getElementById('students');
    const receiverDidData = JSON.parse(dropDown.options[dropDown.selectedIndex].value);
    did = await w3d.getAddressInUse();
    // TODO: build correct VC or credentialSubject
    return {
      eductxVersion: "2.0", timestamp: Date.now().toString(), person: {
        id: document.getElementById("studentId").value,
        firstName: receiverDidData.firstName,
        lastName: receiverDidData.lastName,
        ethAddress: "",
        eduCTXid: receiverDidData.id,
      }, certificate: {
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
   * Saves Moodle's user DID to a variable in this AMD scope
   * @param {string} id - id to save locally for use with registration
   */
  const sendIdToJs = (id) => {
    moodleDid = id;
  };

  /**
   * Saves Moodle's isAuthorized to a variable in this AMD scope
   * @param {string} authorized - variable to save locally for use with registration
   */
  const sendAuthorizedToJs = (authorized) => {
    isAuthorized = authorized;
  };

  /**
   * Saves Unit Id to a variable in this AMD scope
   * @param {string} unitId
   */
  const sendUnitIdToJs = (unitId) => {
    currentUnitId = unitId;
  };

  return {
    initializeEventListeners, updateCurrentAccountData, updateErrorReporting, sendIdToJs, sendUnitIdToJs, sendAuthorizedToJs
  };
});

