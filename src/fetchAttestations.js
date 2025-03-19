import { BrowserProvider, toUtf8String } from "ethers";

const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const LINEA_SCAN_API_KEY = import.meta.env.VITE_LINEA_SCAN_API_KEY;

const INFURA_URL = `https://linea-sepolia.infura.io/v3/${INFURA_API_KEY}`;
const provider = new BrowserProvider(window.ethereum);

const extractArticleURL = (inputData) => {
    try {
        if (!inputData || inputData.length < 64) return "Unknown Page";
        const hexData = inputData.slice(-64);
        console.log("🧐 Extracted Hex Data:", hexData);
        if (/^0+$/.test(hexData)) {
            console.warn("⚠️ Skipping zero-filled hex data");
            return "Unknown Page";
        }
        if (!/^([0-9A-Fa-f]{2})+$/.test(hexData)) {
            console.warn(" Skipping invalid hex data:", hexData);
            return "Unknown Page";
        }
        const url = toUtf8String(`0x${hexData}`).replace(/\0/g, '').trim();
        console.log("Decoded URL:", url);

        return url.startsWith("http") ? url : "Unknown Page";
    } catch (error) {
        console.error(" Error extracting URL:", error);
        return "Unknown Page";
    }
};
// Fetch attestations from LineaScan API
export const fetchAttestations = async () => {
    try {
        const CONTRACT_ADDRESS = "0xf494b93e9661333d0e7ca1b880b9aaf79cb84697";
        const API_URL = `https://api-sepolia.lineascan.build/api?module=account&action=txlist&address=${CONTRACT_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${LINEA_SCAN_API_KEY}`;

        console.log("🔍 Fetching from API:", API_URL);

        const response = await fetch(API_URL);
        const data = await response.json();

        console.log("API Response:", data);

        if (data.status !== "1") throw new Error(" Failed to fetch data. API returned:", data);

        return data.result.map((tx) => { 
            console.log("🔍 Raw input data:", tx.input);

            const isPositive = tx.input.includes("0000000000000000000000000000000000000001");
            const isNegative = tx.input.includes("0000000000000000000000000000000000000000");

            return {
                txHash: tx.hash,
                blockNumber: Number(tx.blockNumber),
                from: tx.from,
                timestamp: new Date(tx.timeStamp * 1000).toISOString(),
                articlePage: extractArticleURL(tx.input),            
                positiveFeedback: isPositive ? 1 : 0,
                negativeFeedback: isNegative ? 1 : 0,          
            };
        });
    } catch (error) {
        console.error(" Error fetching attestations:", error);
        return [];
    }
};
