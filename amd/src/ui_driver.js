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
  let endpoint = "http://localhost:3001";
  let apiKey = "placheolderapikey";

  // Module inits
  // const buffer = Buffer.init();
  // const jpack = Jpack.init();
  // const ecies = Ecies.init();
  // const pdfmake = Pdfmake.init();
  const connector = Connector.init();
  let masca;

  // Global vars
  let did;

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
    document.getElementById("wasAwardedBy").value = window.location.origin;
    if (isAuthorized) {
      document.getElementById("connectFlow").hidden = true;
      document.getElementById("issueCertificate").addEventListener('click', () => {
        issueCredentials();
      });
      document.getElementById('students').addEventListener('change', function() {
        document.getElementById("issueCertificate").disabled = document.getElementById("students").selectedOptions.length <= 0;
      });
      document.getElementById("issueAnotherButton").addEventListener("click", () => {
        document.getElementById("issueAnother").hidden = true;
        updateUI(UI.AP);
        updateErrorReporting("", "", ERROR.SUCCESS);
      });
      document.getElementById("saveTemplate").addEventListener("click", () => {
        saveTemplateToDb();
      });
      document.getElementById("templates").addEventListener('change', (e) => {
        updateFields(JSON.parse(e.target.value));
        document.getElementById("deleteTemplate").disabled = false;
      });
      document.getElementById("deleteTemplate").addEventListener("click", () => {
        deleteTemplate();
      });
      updateUI(UI.AP);
      return;
    }
    document.getElementById("connectFlow").hidden = false;
    // Connect Masca button
    document.getElementById("connectButton").addEventListener('click', async() => {
      document.getElementById("connectButton").disabled = true;
      await w3d.connectClientProvider(async(success) => {
        if (!success) {
          updateErrorReporting("Wallet not installed", "Please consider installing" +
            "<a href='https://metamask.io/'>Metamask</a>.", ERROR.DANGER);
          document.getElementById("connectButton").disabled = false;
          return;
        }
        initializeProviderEventListeners();
        await initMasca();
        await updateCurrentAccountData();
      });
    });
    document.getElementById("refreshCredentials").addEventListener("click", () => {
      showCredentials();
    });
    document.getElementById("useAccountButton").addEventListener("click", () => {
      saveDidToDb(did);
    });
    document.getElementById("useAccountDisclaimer").addEventListener("change", (e) => {
      document.getElementById("useAccountButton").disabled = !e.target.checked;
    });
  };

  const initMasca = async() => {
    const address = await w3d.getAddressInUse();
    const enableResult = await connector.enableMasca(address, {
      snapId: "npm:@blockchain-lab-um/masca",
      version: "v1.2.2",
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
    if (!isAuthorized) {
      showCredentials();
    }
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
  const issueCredentials = async() => {
    const url = `${endpoint}/issue-deferred/batch`;
    let credentialSubjects = await buildCredentialSubjects();
    const headers = {
      'Content-Type': 'application/json',
      'schemaType': '#educationCredentialBatch',
      "x-api-key": apiKey
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(credentialSubjects),
      });

      if (!response.ok) {
        updateErrorReporting("Error issuing credentials", "There has been an error issuing credentials", ERROR.DANGER);
        return;
      }
      updateErrorReporting("Credentials issued successfully", "Your credentials have been issued successfully.", ERROR.SUCCESS);
    } catch (error) {
      updateErrorReporting("Error issuing credentials", "There has been an error issuing credentials", ERROR.DANGER);
    }
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
    did = (await masca.getDID()).data;
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
                        Please change your account in MetaMask to <b>${moodleDid}</b>
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

  const proofOfPossession = async(url) => {
    const response = await fetch(url);
    const signedData = await masca.signData({
      type: "JWT",
      data: {
        header: {
          typ: "JWT"
        },
        payload: await response.json(),
      }
    });

    if (connector.isError(signedData)) {
      updateErrorReporting("Failed to sign the data",
        "There has been an error signing the proof of possession data.", ERROR.DANGER);
    }
    return signedData.data;
  };

  const getCredentialsWithPop = async() => {
    const url = `${endpoint}/query`;
    const proof = await proofOfPossession(`${url}/nonce/${did}`);
    const claimResponse = await fetch(`${url}/claim`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-pop': proof
      },
    });
    return await claimResponse.json();
  };

  /**
   * Fetches and shows current user's certificates
   */
  const showCredentials = async() => {
    const vcs = await getCredentialsWithPop();
    did = (await masca.getDID()).data;
    // eslint-disable-next-line no-console
    console.log(did);
    if (vcs.length === 0) {
      document.getElementById("viewCertFlow").innerHTML = "<h2>No credentials yet</h2>\n";
      return;
    }
    document.getElementById("viewCertFlow").innerHTML = buildCredentialsTable(vcs);
    document.querySelectorAll(".claim-credential").forEach(btn => {
      btn.addEventListener('click', async function() {
        // eslint-disable-next-line no-console
        this.disabled = true;
        const credObj = JSON.parse(this.dataset.cred);
        const saved = await saveCredential(credObj);
        if (saved) {
          const deleted = await requestDeletion(credObj.id);
          if (deleted) {
            document.getElementById(credObj.id).hidden = true;
          }
        }
        this.disabled = false;
      });
    });

    document.querySelectorAll(".reject-credential").forEach(btn => {
      btn.addEventListener('click', async function() {
        this.disabled = true;
        const credObj = JSON.parse(this.dataset.cred);
        const rejected = await requestDeletion(credObj.id);
        if (rejected) {
          document.getElementById(credObj.id).hidden = true;
        }
      });
    });
    updateErrorReporting("", "", ERROR.SUCCESS);
  };

  /**
   * Build PDF and export the cert
   * @param {obj} certificate - Certificate to build PDF for
   */
  // const exportPdf = async(certificate) => {
  //   // Pdfmake.vfs = Fonts.pdfMake.vfs;
  //   pdfmake.fonts = {
  //     Roboto: {
  //       normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
  //       bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
  //       italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
  //       bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
  //     },
  //   };
  //   const docDefinition = await pdf.getContent(certificate);
  //   // eslint-disable-next-line no-console
  //   console.log(docDefinition);
  //   pdfmake
  //     .createPdf(docDefinition)
  //     .download(
  //       certificate.person.firstName +
  //       '_' +
  //       certificate.person.lastName +
  //       '_' +
  //       certificate.certificate.unitTitle + ".pdf"
  //     );
  //
  //   // eslint-disable-next-line no-console
  //   console.log(certificate);
  // };

  /**
   * Build HTML table to show certificates
   * @param {[obj]} vcs - Certificates to show
   * @return {string}
   */
  const buildCredentialsTable = (vcs) => {
    let credentialsTable;
    if (vcs.length === 0) {
      credentialsTable = "<h2>No credentials yet</h2>";
    } else {
      credentialsTable = "<h2 id='shownCertsTitle'>My Credentials</h2>";
      credentialsTable += "<div style=\"overflow-x: scroll;\"><table class='table'>" +
        "<thead><th>Type</th>" +
        "<th>Title</th><th>Achievement</th><th>Grade</th><th>Awarding Body</th><th>ECTS</th><th></th><th></th></thead>" +
        "<tbody>";
      vcs.forEach((credObj) => {
        const cred = credObj.credential;
        credentialsTable += `<tr id='${credObj.id}'>`;
        credentialsTable += `<td>${cred.type[1] !== "" ? cred.type[1] : "-"}</td>`;
        credentialsTable += `<td>${cred.credentialSubject.achieved.title}</td>`;
        credentialsTable += `<td>${cred.credentialSubject.achieved.title}</td>`;
        credentialsTable += `<td>${cred.credentialSubject.achieved.wasDerivedFrom.grade}</td>`;
        credentialsTable += `<td>${cred.credentialSubject.achieved.wasAwardedBy.awardingBodyDescription}</td>`;
        credentialsTable += `<td>${cred.credentialSubject.achieved.specifiedBy.eCTSCreditPoints}</td>`;
        credentialsTable += `<td>
                    <button data-cred='${JSON.stringify(credObj)}' class="btn btn-primary claim-credential">Claim
                    </input>`;
        credentialsTable += `<td>
                    <button data-cred='${JSON.stringify(credObj)}' class="btn btn-danger reject-credential">Reject
                    </input>`;
        credentialsTable += "</tr>";
      });
      credentialsTable += "</tbody></table></div>";
    }
    return credentialsTable;
  };

  const saveCredential = async(credObj) => {
    const credential = credObj.credential;
    const res = await masca.saveCredential(credential, {
      store: ['snap'],
    });
    if (connector.isError(res)) {
      updateErrorReporting("Error saving credential", "There has been an error trying to save the credential", ERROR.DANGER);
      return false;
    }
    updateErrorReporting("Credential saved", "The credential has been saved successfully", ERROR.SUCCESS);
    return true;
  };

  const requestDeletion = async(id) => {
    const url = `${endpoint}/query`;
    const proof = await proofOfPossession(`${endpoint}/query/nonce/${did}`);
    try {
      const response = await fetch(`${url}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-pop': proof,
        },
      });
      if (!response.ok) {
        updateErrorReporting("Deletion failed", "Unable to delete the remote credential", ERROR.WARNING);
        return false;
      }
      return true;
    } catch (error) {
      updateErrorReporting("Deletion failed", "Unable to delete the remote credential", ERROR.WARNING);
      return false;
    }
  };

  /**
   * Updates certificate fields from saved template
   * @param {obj} template - Certificate fields from template {}
   */
  const updateFields = (template) => {
    document.getElementById("title").value = template.title;
    document.getElementById("achievement").value = template.achievement;
    document.getElementById("wasAwardedBy").value = template.wasAwardedBy;
    document.getElementById("grade").value = template.grade;
    document.getElementById("awardingBodyDescription").value = template.awardingBodyDescription;
    document.getElementById("ects").value = template.ects;
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
    document.getElementById("id_title").value = document.getElementById("title").value;
    document.getElementById("id_achievement").value = document.getElementById("achievement").value;
    document.getElementById("id_wasAwardedBy").value = document.getElementById("wasAwardedBy").value;
    document.getElementById("id_grade").value = document.getElementById("grade").value;
    document.getElementById("id_awardingBodyDescription").value = document.getElementById("awardingBodyDescription").value;
    document.getElementById("id_ects").value = document.getElementById("ects").value;
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
      document.getElementById("addressElement").innerHTML =
        did.substring(0, 12) + "..." + did.substring(did.length - 4, did.length);
    }
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
        document.getElementById("userData").hidden = true;
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
  const buildCredentialSubjects = async() => {
    let dropDown = document.getElementById('students');
    const selectedValues = [];
    for (let i = 0; i < dropDown.options.length; i++) {
      if (dropDown.options[i].selected) {
        const value = JSON.parse(dropDown.options[i].value);
        selectedValues.push({
          credentialSubject: {
            currentFamilyName: value.lastName,
            currentGivenName: value.firstName,
            id: value.did,
            dateOfBirth: null,
            personIdentifier: null,
            achieved: {
              id: null,
              title: document.getElementById("achievement").value,
              specifiedBy: {
                id: null,
                title: "Example", // Course iz moodla ime
                volumeOfLearning: null,
                iSCEDFCode: null,
                eCTSCreditPoints: document.getElementById("ects").value
              },
              wasAwardedBy: {
                id: document.getElementById("wasAwardedBy").value,
                awardingBody: null,
                awardingBodyDescription: document.getElementById("awardingBodyDescription").value,
                awardingDate: null,
                awardingLocation: null
              },
              wasDerivedFrom: {
                id: null,
                title: document.getElementById("title").value,
                grade: document.getElementById("grade").value,
                issuedDate: Date.now().toString()
              },
              associatedLearningOpportunity: null
            }
          }
        });
      }
    }
    return selectedValues;
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

  const sendIssuerEndpointToJs = (issuerEndpoint) => {
    endpoint = issuerEndpoint;
  };

  const sendApiKeyToJs = (issuerApiKey) => {
    apiKey = issuerApiKey;
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
    sendUnitIdToJs,
    sendAuthorizedToJs,
    sendIssuerEndpointToJs,
    sendApiKeyToJs
  };
});

