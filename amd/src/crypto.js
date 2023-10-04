define(["mod_eductx/buffer"], function(buffer) {
  const Buffer = buffer.init();
  const generateKey = async() => {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-CBC',
        length: 256, // Can be  128, 192, or 256
      },
      true, // Whether the key is extractable (i.e. can be used in exportKey)
      ['encrypt', 'decrypt'] // Can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
  };

  const exportKey = async(key) => {
    return await window.crypto.subtle.exportKey(
      'jwk', // Can be "jwk" or "raw"
      key // Extractable must be true
    );
  };

  const importKey = async(key) => {
    return await window.crypto.subtle.importKey(
      'jwk', // Can be "jwk" or "raw"
      key,
      {
        // This is the algorithm options
        name: 'AES-CBC',
        length: 256,
      },
      false, // Whether the key is extractable (i.e. can be used in exportKey)
      ['encrypt', 'decrypt'] // Can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
    );
  };

  const encrypt = async(key, data, iv) => {
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        // Don't re-use initialization vectors!
        // Always generate a new iv every time your encrypt!
        iv: iv,
      },
      key, // From generateKey or importKey above
      Buffer.Buffer.from(new TextEncoder().encode(data)) // ArrayBuffer of data you want to encrypt
    );

    return Buffer.Buffer.from(encryptedData).toString('base64');
  };

  const decrypt = async(key, data, iv) => {
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: iv, // The initialization vector you used to encrypt
      },
      key, // From generateKey or importKey above
      Buffer.Buffer.from(data, 'base64') // ArrayBuffer of the data
    );

    return new TextDecoder().decode(decryptedData);
  };

  return {
    decrypt,
    encrypt,
    importKey,
    exportKey,
    generateKey
  };
});