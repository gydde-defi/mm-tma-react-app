import { useSDK } from '@metamask/sdk-react';
import React, { useState } from 'react';
import '../src/App.css';
import { send_eth_signTypedData_v4, send_personal_sign } from '../src/SignHelpers';
import axios from "axios";
import {bufferToBase64url, getAuthMessage, transformPublicKey} from "./WebAuthnUtils";

export const Mod = () => {

  // State variables for account, error, chain ID, keys, and token
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [chainId, setChainId] = useState("");
  const [keys, setKeys] = useState({});
  const [token, setToken] = useState("");

  // Function to connect to the Ethereum wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        setChainId(chainId.toString);
      } catch (error) {
        console.error("User denied account access");
      }
    } else {
      console.error("Ethereum provider not detected");
    }
  };

  // Function to disconnect from the Ethereum wallet
  const disconnect = () => {
    setAccount("");
    setChainId("");
  };

  // Function to sign a message using the Ethereum wallet
  const signMessage = async (message) => {
    try {
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [account, message],
      });
      return signature;
    } catch (error) {
      setError(error.toString());
    }
  };

  // Convert account to lowercase for uniformity
  const username = account.toLowerCase();

  // Function to login using Passkey
  const login = async () => {
    try {
      const startResponse = await axios.post(
          "https://encryption.lighthouse.storage/passkey/login/start",
          {
            address: username,
          }
      );
      const publicKey = startResponse.data;
      const [transformedPublicKey, credentialID] = transformPublicKey(publicKey);

      // Get credentials using WebAuthn
      const credential = await navigator.credentials.get({
        publicKey: transformedPublicKey,
      });

      // Convert credential to a format suitable for the backend
      const serializeable = {
        authenticatorAttachment: credential.authenticatorAttachment,
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        response: {
          attestationObject: bufferToBase64url(credential.response.attestationObject),
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          signature: bufferToBase64url(credential.response.signature),
          authenticatorData: bufferToBase64url(credential.response.authenticatorData),
        },
        type: credential.type,
      };

      const finishResponse = await axios.post(
          "https://encryption.lighthouse.storage/passkey/login/finish",
          {
            credentialID,
            data: credential,
          }
      );
      const token = finishResponse.data.token;
      setToken(token);
      if (token) {
        alert("Successfully authenticated using webAuthn");
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  // Function to register using Passkey
  const register = async () => {
    try {
      const { message } = await getAuthMessage(account.toLowerCase());
      const signedMessage = await signMessage(message);
      const response = await axios.post(
          "https://encryption.lighthouse.storage/passkey/register/start",
          {
            address: account.toLowerCase(),
          }
      );
      const publicKey = {
        ...response.data,
        challenge: new Uint8Array([...response.data?.challenge?.data]),
        user: {
          ...response.data?.user,
          id: new Uint8Array([...response.data?.user?.id]),
        },
      };

      // Create credentials using WebAuthn
      const data = await navigator.credentials.create({ publicKey });

      const finishResponse = await axios.post(
          "https://encryption.lighthouse.storage/passkey/register/finish",
          {
            data,
            address: username,
            signature: signedMessage,
            name: "MY Phone",
          }
      );

      const finishData = await finishResponse.data;
      if (finishData) {
        alert("Successfully registered with WebAuthn");
      } else {
        throw new Error("Registration was not successful");
      }
    } catch (error) {
      alert(error.message);
    }
  };

  // Function to delete credentials
  const deleteCredentials = async () => {
    try {
      const startResponse = await axios.post(
          "https://encryption.lighthouse.storage/passkey/login/start",
          {
            address: username,
          }
      );
      const publicKey = startResponse.data;
      const { message } = await getAuthMessage(account.toLowerCase());
      const signedMessage = await signMessage(message);
      const response = await axios.delete(
          "https://encryption.lighthouse.storage/passkey/delete",
          {
            data: {
              address: account.toLowerCase(),
              credentialID: publicKey.allowCredentials[0]?.credentialID,
            },
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${signedMessage}`,
            },
          }
      );
    } catch (error) {
      alert(error.message);
    }
  };

  // Render the app UI
  return (
      <div className="App">
        <header className="App-header">
          {!account ? (
              <button className="App-link" onClick={connectWallet}>
                Connect Wallet
              </button>
          ) : (
              <button className="App-link" onClick={disconnect}>
                Disconnect
              </button>
          )}
          <p>{`Account: ${account}`}</p>
          <p>{`Network ID: ${chainId ? Number(chainId) : "No Network"}`}</p>
          <p>
            Edit <code>src/App.jsx</code> and save to reload.
          </p>
          {account && (
              <>
                <button className="App-link" onClick={register}>
                  Register
                </button>
                <button className="App-link" onClick={login}>
                  Login
                </button>
                <button className="App-link" onClick={deleteCredentials}>
                  Delete
                </button>
                <textarea
                    style={{ fontWeight: "0.9rem", maxWidth: "80vw" }}
                    value={`Bearer ${token}`}
                ></textarea>
              </>
          )}
        </header>
      </div>
  );
};

export default Mod;
