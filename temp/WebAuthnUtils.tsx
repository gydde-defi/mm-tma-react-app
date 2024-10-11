import axios from "axios";

export const getAuthMessage = async (address) => {
    try {
        const data = await axios
            .get(`https://encryption.lighthouse.storage/api/message/${address}`, {
                headers: {
                    "Content-Type": "application/json",
                },
            })
            .then((res) => res.data[0].message);
        return { message: data, error: null };
    } catch (err) {
        return { message: null, error: err?.response?.data || err.message };
    }
};

export function bufferToBase64url(buffer) {
    const byteView = new Uint8Array(buffer);
    let str = "";
    // @ts-ignore
    for (const charCode of byteView) {
        str += String.fromCharCode(charCode);
    }

    // Binary string to base64
    const base64String = btoa(str);

    // Base64 to base64url
    // We assume that the base64url string is well-formed.
    const base64urlString = base64String
        ?.replace(/\+/g, "-")
        ?.replace(/\//g, "_")
        ?.replace(/=/g, "");
    return base64urlString;
}

export function base64urlToBuffer(base64url) {
    let binary = atob(base64url?.replace(/_/g, "/")?.replace(/-/g, "+"));
    let length = binary.length;
    let buffer = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        buffer[i] = binary.charCodeAt(i);
    }

    return buffer;
}

export function transformPublicKey(publicKey) {
    const selected_key_index = 0;
    let transformedPublicKey = {
        ...publicKey,
        challenge: new Uint8Array([...publicKey.challenge.data]),
        allowCredentials: [
            {
                type: "public-key",
                id: base64urlToBuffer(
                    publicKey.allowCredentials[selected_key_index]?.credentialID
                ),
            },
        ],
    };

    return [
        transformedPublicKey,
        publicKey.allowCredentials[selected_key_index]?.credentialID,
    ];
}