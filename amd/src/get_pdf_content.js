define(["mod_eductx/assets",
  "mod_eductx/position_calculator",
  "mod_eductx/qrcode",
  "mod_eductx/buffer",
  "mod_eductx/crypto",
], function(assets, PositionCalculator, qrcode, buffer, crypto) {
  const QRCode = qrcode.init();
  const Buffer = buffer.init();
  const athenaTemplate = async(
    certificate,
    qrCodeBase64,
    personFullName,
    date
  ) => {
    const {
      certificate: {
        shortDescription,
        unitMeasurement: unit,
        unitTitle: title,
        value,
        fullDescriptionURI,
      },
    } = certificate;
    const fontSizeFullName = getFontSize(personFullName.length);
    return {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      background: [{
        svg: '<svg width="850" height="600"><rect width="100%" height="100%" style="fill:rgb(253, 245, 234);"/></svg>',
      }],
      content: [
        {
          columns: [
            {
              width: 500,
              margin: [
                0,
                5,
                // 8 + pos.calcTopMargin(shortDescription, title),
                0,
                0,
              ],
              alignment: 'left',
              stack: [
                {
                  width: 150,
                  image: assets.athenaLogo,
                  link: fullDescriptionURI,
                },
                {
                  text: title,
                  margin: [0, 75, 30, 0],
                  fontSize: getFontSize(title.length),
                  color: "#333C75"
                },
                {
                  text: 'ISSUED TO',
                  margin: [0, 30, 30, 10],
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#333C75',
                },
                {
                  text: personFullName,
                  margin: [0, 10, 30, 0],
                  fontSize: fontSizeFullName,
                  color: "#333C75",
                  bold: true,
                },
                {
                  alignment: 'left',
                  svg: '<svg height="1" width="500">' +
                    '<line x1="0" y1="0" x2="460" y2="0" stroke="#333C75" stroke-width="0.8"/></svg>',
                },
                {
                  text: shortDescription,
                  alignment: 'left',
                  margin: [0, 10, 30, 0],
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#333C75',
                },
                {
                  margin: [0, 100, 0, 0],
                  columns: [
                    {
                      stack: [
                        {
                          text: 'MEASUREMENT UNIT',
                          fontSize: 14,
                          color: '#333C75',
                          alignment: 'left',
                        },
                        {
                          text: `${value} ${unit}`,
                          bold: true,
                          fontSize: 14,
                          alignment: 'left',
                          margin: [0, 2, 0, 0],
                          color: "#333C75"
                        },
                      ],
                    },
                    {
                      stack: [
                        {
                          text: 'CERTIFICATE ISSUED',
                          fontSize: 14,
                          color: '#333C75',
                          alignment: 'left',
                        },
                        {
                          text: date.toLocaleString(),
                          fontSize: 14,
                          bold: true,
                          alignment: 'left',
                          margin: [0, 2, 0, 0],
                          color: "#333C75"
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              alignment: "right",
              width: 350,
              stack: [
                // Logos side by side
                {
                  width: "100%",
                  columns: [
                    {
                      align: "right",
                      image: assets.eduCtxLogo,
                      width: 48,
                      height: 48,
                    },
                    {
                      align: "left",
                      image: assets.bclabLogo,
                      height: 48,
                      width: 133,
                      margin: [-42, 0, 0, 0]
                    },
                  ],
                  margin: [0, 0, 0, 30]
                },
                // Text about scanning the QR code
                {
                  alignment: "left",
                  text: [
                    'Scan the QR code to verify the ',
                    {text: 'certificate', bold: true},
                    '.'
                  ],
                  color: '#333C75',
                  margin: [34, 65, 0, 12]
                },
                // QR code
                {
                  alignment: 'center',
                  image: qrCodeBase64,
                  width: 300,
                  margin: [0, 0, 0, 0]
                },
              ],
              margin: [0, 5, 0, 0],
            },
          ],
        },
      ],
      pageMargins: [24, 64, 24, 32],
    };
  };

  const stringToBase64 = (data) => {
    return Buffer.Buffer.from(new TextEncoder().encode(data)).toString('base64');
  };

  const pushToIpfs = async(data) => {
    const ipfsApiUrl = 'https://bclabum.informatika.uni-mb.si/ipfs-post/api/v0/add';
    const formData = new FormData();
    formData.append('file', new Blob([data], {type: 'text/plain'}));

    try {
      const response = await fetch(ipfsApiUrl, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const json = await response.json();
      return json.Hash;
    } catch (error) {
      // eslint-disable-next-line no-console
      return error.message;
    }
  };

  const createShareableURL = async(certificate) => {
    const data = JSON.stringify(certificate);
    const key = await crypto.generateKey();
    const exportedKey = JSON.stringify(await crypto.exportKey(key));
    const keyBase64 = stringToBase64(exportedKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const ivBase64 = Buffer.Buffer.from(iv).toString('base64');
    const encryptedData = await crypto.encrypt(key, data, iv);
    const ipfsPath = await pushToIpfs(encryptedData);
    // Create final URL
    return `https://platform.eductx.org/verify/?ipfs=${encodeURIComponent(
      ipfsPath
    )}&iv=${encodeURIComponent(ivBase64)}&key=${encodeURIComponent(
      keyBase64
    )}`;
  };

  const generateQR = async(data) => {
    try {
      let qr = new QRCode({
        value: data,
        size: 300,
        backgroundAlpha: 0,
        padding: 0,
        foreground: "#333C75"
      });

      return await qr.toDataURL();
    } catch (e) {
      return e.message;
    }
  };

  const getFontSize = (lengthOfName) => {
    let fontsizeFullName = 12;
    if (lengthOfName <= 17) {
      fontsizeFullName = 38;
    } else if (lengthOfName > 17 && lengthOfName <= 20) {
      fontsizeFullName = 32;
    } else if (lengthOfName > 20 && lengthOfName <= 23) {
      fontsizeFullName = 27;
    } else if (lengthOfName > 23 && lengthOfName <= 26) {
      fontsizeFullName = 23;
    } else if (lengthOfName > 26 && lengthOfName <= 29) {
      fontsizeFullName = 20;
    } else if (lengthOfName > 29 && lengthOfName <= 32) {
      fontsizeFullName = 18;
    } else if (lengthOfName > 32 && lengthOfName <= 35) {
      fontsizeFullName = 16;
    } else if (lengthOfName > 35 && lengthOfName <= 38) {
      fontsizeFullName = 15;
    } else if (lengthOfName > 38 && lengthOfName <= 41) {
      fontsizeFullName = 14;
    }
    return fontsizeFullName;
  };

  const getContent = async(certificate) => {
    const personFullName =
      certificate.person.firstName + ' ' + certificate.person.lastName;
    let date = new Date(0);
    date.setUTCSeconds(certificate.timestamp / 1000);

    let qrCodeBase64 = '';
    try {
      const qrCodeData = await createShareableURL(certificate);
      qrCodeBase64 = await generateQR(qrCodeData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    let docDefinition;
    docDefinition = await athenaTemplate(
      certificate,
      qrCodeBase64,
      personFullName,
      date
    );

    return docDefinition;
  };
  return {getContent};
})
;