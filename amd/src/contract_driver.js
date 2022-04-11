/**
 * @package   mod_eductx
 * @copyright 2021, Urban Vidovič <urban.vidovic2@um.si>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/* eslint-disable no-console */
/* eslint-disable no-alert */

define(["mod_eductx/web3_driver"], function(w3d) {
    const contracts = {
        "eduCTXca": {
            "contractName": "EduCTXca",
            "address": "0xdb4811d6266E2DC70A484282E0A8C7eb4da5896A",
            "abi": [
                {
                    "constant": true,
                    "inputs": [],
                    "name": "owner",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [],
                    "name": "isOwner",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "newOwner",
                            "type": "address"
                        }
                    ],
                    "name": "transferOwnership",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "name": "_dependencyManagerAddress",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "_from",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "_caAddress",
                            "type": "address"
                        },
                        {
                            "indexed": false,
                            "name": "_metaName",
                            "type": "string"
                        },
                        {
                            "indexed": false,
                            "name": "_metaLogoURI",
                            "type": "string"
                        }
                    ],
                    "name": "AddCA",
                    "type": "event"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "_from",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "_caAddress",
                            "type": "address"
                        }
                    ],
                    "name": "RemoveCA",
                    "type": "event"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": false,
                            "name": "_type",
                            "type": "string"
                        },
                        {
                            "indexed": true,
                            "name": "_from",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "_caAddress",
                            "type": "address"
                        },
                        {
                            "indexed": false,
                            "name": "_newMetaData",
                            "type": "string"
                        }
                    ],
                    "name": "ChangeCaMeta",
                    "type": "event"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "_caAddress",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "_authorizedAddress",
                            "type": "address"
                        }
                    ],
                    "name": "AddAuthorizedAddress",
                    "type": "event"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "_caAddress",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "_authorizedAddress",
                            "type": "address"
                        }
                    ],
                    "name": "RemoveAuthorizedAddress",
                    "type": "event"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "previousOwner",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "newOwner",
                            "type": "address"
                        }
                    ],
                    "name": "OwnershipTransferred",
                    "type": "event"
                },
                {
                    "constant": false,
                    "inputs": [],
                    "name": "init",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_address",
                            "type": "address"
                        }
                    ],
                    "name": "isCa",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_address",
                            "type": "address"
                        }
                    ],
                    "name": "isAuthorizedAddress",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_caAddress",
                            "type": "address"
                        },
                        {
                            "name": "_metaName",
                            "type": "string"
                        },
                        {
                            "name": "_metaLogoURI",
                            "type": "string"
                        }
                    ],
                    "name": "addCa",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_caAddress",
                            "type": "address"
                        }
                    ],
                    "name": "removeCa",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_authorizedAddress",
                            "type": "address"
                        }
                    ],
                    "name": "addAuthorizedAddress",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_authorizedAddress",
                            "type": "address"
                        }
                    ],
                    "name": "removeAuthorizedAddress",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_newMetaName",
                            "type": "string"
                        },
                        {
                            "name": "_newMetaLogoURI",
                            "type": "string"
                        }
                    ],
                    "name": "changeMeta",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_caAddress",
                            "type": "address"
                        }
                    ],
                    "name": "getCaMetaData",
                    "outputs": [
                        {
                            "name": "",
                            "type": "string"
                        },
                        {
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [],
                    "name": "getAllCa",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address[]"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_ca",
                            "type": "address"
                        }
                    ],
                    "name": "getAuthorizedAddressesByCa",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address[]"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_authorizedAddress",
                            "type": "address"
                        }
                    ],
                    "name": "getAuthorizedAddressCa",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        },
        "registeredUser": {
            "contractName": "RegisteredUser",
            "address": "0x85FB2805c9B05d24584d90F4B3d5fD7791d8979f",
            "abi": [
                {
                    "constant": true,
                    "inputs": [],
                    "name": "owner",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [],
                    "name": "isOwner",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "newOwner",
                            "type": "address"
                        }
                    ],
                    "name": "transferOwnership",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "name": "_dependencyManagerAddress",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "previousOwner",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "newOwner",
                            "type": "address"
                        }
                    ],
                    "name": "OwnershipTransferred",
                    "type": "event"
                },
                {
                    "constant": false,
                    "inputs": [],
                    "name": "init",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_id",
                            "type": "uint256"
                        }
                    ],
                    "name": "isRegisteredUser",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_userAddress",
                            "type": "address"
                        },
                        {
                            "name": "_userPubKey",
                            "type": "bytes"
                        },
                        {
                            "name": "_id",
                            "type": "uint256"
                        }
                    ],
                    "name": "registerUser",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_userAddress",
                            "type": "address"
                        }
                    ],
                    "name": "getIDbyAddress",
                    "outputs": [
                        {
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_id",
                            "type": "uint256"
                        }
                    ],
                    "name": "getUserPubKeyById",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bytes"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_id",
                            "type": "uint256"
                        }
                    ],
                    "name": "getAddressById",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        },
        "eduCTXtoken": {
            "contractName": "EduCTXtoken",
            "address": "0x631A1c61c519766269C23a73DBE6BE5D8317F504",
            "abi": [
                {
                    "constant": true,
                    "inputs": [],
                    "name": "owner",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [],
                    "name": "isOwner",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "newOwner",
                            "type": "address"
                        }
                    ],
                    "name": "transferOwnership",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "name": "_dependencyManagerAddress",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "from",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "to",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "Transfer",
                    "type": "event"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "from",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "userID",
                            "type": "uint256"
                        },
                        {
                            "indexed": false,
                            "name": "dataHash",
                            "type": "string"
                        },
                        {
                            "indexed": false,
                            "name": "dataCipher",
                            "type": "string"
                        }
                    ],
                    "name": "CertificateIssued",
                    "type": "event"
                },
                {
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "name": "previousOwner",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "name": "newOwner",
                            "type": "address"
                        }
                    ],
                    "name": "OwnershipTransferred",
                    "type": "event"
                },
                {
                    "constant": false,
                    "inputs": [],
                    "name": "init",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_userID",
                            "type": "uint256"
                        },
                        {
                            "name": "_dataHash",
                            "type": "string"
                        },
                        {
                            "name": "_dataCipher",
                            "type": "string"
                        }
                    ],
                    "name": "issueCertificate",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_userID",
                            "type": "uint256"
                        },
                        {
                            "name": "_dataHash",
                            "type": "string"
                        },
                        {
                            "name": "_dataUri",
                            "type": "string"
                        }
                    ],
                    "name": "issueCertificateAuthorizedAddress",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "revokeCertificate",
                    "outputs": [],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_caAddress",
                            "type": "address"
                        }
                    ],
                    "name": "getIssuedTokensByCa",
                    "outputs": [
                        {
                            "name": "",
                            "type": "uint256[]"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "_authorizedAddress",
                            "type": "address"
                        }
                    ],
                    "name": "getIssuedTokensByAuthorizedAddress",
                    "outputs": [
                        {
                            "name": "",
                            "type": "uint256[]"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "owner",
                            "type": "address"
                        }
                    ],
                    "name": "balanceOf",
                    "outputs": [
                        {
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "ownerOf",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "owner",
                            "type": "address"
                        },
                        {
                            "name": "index",
                            "type": "uint256"
                        }
                    ],
                    "name": "tokenOfOwnerByIndex",
                    "outputs": [
                        {
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [],
                    "name": "totalSupply",
                    "outputs": [
                        {
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "index",
                            "type": "uint256"
                        }
                    ],
                    "name": "tokenByIndex",
                    "outputs": [
                        {
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "tokenIssuerAddr",
                    "outputs": [
                        {
                            "name": "",
                            "type": "address"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "tokenDataHash",
                    "outputs": [
                        {
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [
                        {
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "name": "tokenCipherText",
                    "outputs": [
                        {
                            "name": "",
                            "type": "string"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        }
    };
    let web3;
    let contractInstances = {};

    /**
     * Initializes smart contract instances
     */
    const initializeContracts = () => {
        web3 = w3d.getWeb3Instance();
        contractInstances.registeredUser = instantiateContract(contracts.registeredUser.abi, contracts.registeredUser.address);
        contractInstances.eduCTXtoken = instantiateContract(contracts.eduCTXtoken.abi, contracts.eduCTXtoken.address);
        contractInstances.eduCTXca = instantiateContract(contracts.eduCTXca.abi, contracts.eduCTXca.address);
    };

    /**
     * Returns contract's instance
     * @param {string} name - Contract's name
     * @return {*}
     */
    const getContractInstance = (name) => {
        return contractInstances[name];
    };

    /**
     * Connects to smart contract and resolves to contract instance
     * @param {any[]} abi - contract's abi
     * @param {string} address - contract's address
     * @returns {Promise<Contract|R>}
     */
    const instantiateContract = (abi, address) => {
        web3.eth.defaultAccount = web3.eth.accounts[0];
        return new web3.eth.Contract(abi, address);
    };

    /**
     * Fetch certificate ciphers for passed address
     * @param {string} address - Address for which to get certificates
     * @return {Promise<*[]>}
     */
    const fetchCertificates = async(address) => {
        const contract = contractInstances.eduCTXtoken;
        const balance = await contract.methods.balanceOf(address).call({from: address});
        let certs = [];
        for (let i = 0; i < balance; ++i) {
            const tokenId = await contract.methods.tokenOfOwnerByIndex(address, i).call({from: address});
            const tokenCipher = await contract.methods.tokenCipherText(tokenId).call({from: address});
            certs.push(tokenCipher);
        }
        return certs;
    };

    return {
        initializeContracts,
        getContractInstance,
        fetchCertificates
    };
});
