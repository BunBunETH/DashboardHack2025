import { ethers } from "ethers";
import { BrowserProvider, toUtf8String } from "ethers"; // ✅ Fix utils import

const INFURA_API_KEY = import.meta.env.VITE_INFURA_API_KEY;
const LINEA_SCAN_API_KEY = import.meta.env.VITE_LINEA_SCAN_API_KEY;

const INFURA_URL = `https://linea-sepolia.infura.io/v3/${INFURA_API_KEY}`;
const provider = new BrowserProvider(window.ethereum);

// ✅ Extract Article URL properly
// Update the extractArticleURL function to fetch data from the transaction
const extractArticleURL = (inputData) => {
    try {
        if (!inputData || inputData.length < 256) return "Unknown Page"; // Prevent errors

        // Extract last 256 characters (assuming URL might be there)
        const hexData = inputData.slice(-256);
        console.log("🧐 Extracted Hex Data:", hexData); // Debugging log

        // Convert hex to UTF-8 string
        let decodedURL = toUtf8String("0x" + hexData).replace(/\0/g, ""); // Remove null characters
        console.log("✅ Decoded URL:", decodedURL); // Debugging log

        // Validate URL format
        return decodedURL.includes("/") ? decodedURL : "Unknown Page"; 
    } catch (error) {
        console.error("❌ Error extracting URL:", error);
        return "Unknown Page";
    }
};

export const fetchAttestations = async () => {
    try {
        const CONTRACT_ADDRESS = "0xf494b93e9661333d0e7ca1b880b9aaf79cb84697";
        const API_URL = `https://api-sepolia.lineascan.build/api?module=account&action=txlist&address=${CONTRACT_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${LINEA_SCAN_API_KEY}`;

        console.log("🔍 Fetching from API:", API_URL);

        const response = await fetch(API_URL);
        const data = await response.json();

        console.log("✅ API Response:", data);

        if (data.status !== "1") throw new Error("❌ Failed to fetch data. API returned:", data);

        return data.result.map((tx) => {
            const isPositive = tx.input.includes("0000000000000000000000000000000000000001");
            const isNegative = tx.input.includes("0000000000000000000000000000000000000000");

            console.log("🔍 Raw input data:", tx.input); // ✅ Debugging log

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
        console.error("❌ Error fetching attestations:", error);
        return [];
    }
};
