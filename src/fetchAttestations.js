import { ethers } from "ethers";
import { BrowserProvider, toUtf8String } from "ethers";

// Conditionally import Node.js specific modules
const isNode = typeof window === 'undefined';
let dotenv, fs, path, fileURLToPath;

if (isNode) {
  // Only import these in Node environment
  dotenv = await import('dotenv');
  fs = await import('fs');
  path = await import('path');
  fileURLToPath = (await import('url')).fileURLToPath;
}

// Initialize dotenv when running in Node
try {
  if (isNode) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    dotenv.default.config({ path: path.resolve(__dirname, '../.env') });
    console.log("📁 Environment loaded from:", path.resolve(__dirname, '../.env'));
  }
} catch (error) {
  console.error("❌ Error loading environment variables:", error);
}

// Get API keys from environment variables
const INFURA_API_KEY = isNode ? process.env.VITE_INFURA_API_KEY : import.meta.env.VITE_INFURA_API_KEY;
const LINEA_SCAN_API_KEY = isNode ? process.env.VITE_LINEA_SCAN_API_KEY : import.meta.env.VITE_LINEA_SCAN_API_KEY;

console.log("🔑 INFURA_API_KEY available:", !!INFURA_API_KEY);
console.log("🔑 LINEA_SCAN_API_KEY available:", !!LINEA_SCAN_API_KEY);

const INFURA_URL = `https://linea-sepolia.infura.io/v3/${INFURA_API_KEY}`;

// Initialize provider only in browser environment
let provider;
try {
  if (!isNode && window.ethereum) {
    provider = new BrowserProvider(window.ethereum);
    console.log("🌐 Browser provider initialized");
  } else {
    console.log("🖥️ Running in Node environment or no ethereum provider available");
  }
} catch (error) {
  console.error("❌ Error initializing provider:", error);
}

// Extract Article URL properly
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

// Helper function to normalize URLs
const normalizeURL = (url) => {
    try {
        // Remove protocol and trailing slashes
        return url.replace(/^https?:\/\//, '')
                 .replace(/\/+$/, '')
                 .toLowerCase();
    } catch (error) {
        console.error("❌ Error normalizing URL:", error);
        return url;
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

        if (data.status !== "1") throw new Error(`❌ Failed to fetch data. API returned: ${JSON.stringify(data)}`);

        // First, map the transactions to our data structure
        const transactions = data.result.map((tx) => {
            // Log the raw input data for debugging
            console.log(`🔍 Raw transaction input for ${tx.hash}:`, tx.input);
            
            // Based on the Lineascan example, we can see that negative feedback has a specific pattern
            // The key part is "0x0000000000000000000000000000000000000000000000000000000000000000" at the beginning of attestationData
            
            let isPositive;
            
            // Check for the specific pattern that indicates negative feedback
            if (tx.input.includes("0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000")) {
                isPositive = false;
                console.log(`❌ Transaction ${tx.hash} identified as NEGATIVE feedback (pattern match)`);
            } 
            // If it doesn't have that pattern, it's likely positive feedback
            else {
                isPositive = true;
                console.log(`✅ Transaction ${tx.hash} identified as POSITIVE feedback (default)`);
            }
            
            const articlePage = extractArticleURL(tx.input);
            
            return {
                txHash: tx.hash,
                blockNumber: Number(tx.blockNumber),
                from: tx.from,
                timestamp: new Date(tx.timeStamp * 1000).toISOString(),
                articlePage,
                normalizedURL: normalizeURL(articlePage),
                positiveFeedback: isPositive ? 1 : 0,
                negativeFeedback: isPositive ? 0 : 1,
                feedbackType: isPositive ? "positive" : "negative"
            };
        });
        
        // Then, aggregate by URL
        const urlMap = new Map();
        
        transactions.forEach(tx => {
            const key = tx.normalizedURL;
            
            if (!urlMap.has(key)) {
                urlMap.set(key, {
                    articlePage: tx.articlePage, // Keep the original URL for display
                    positiveFeedback: 0,
                    negativeFeedback: 0,
                    transactions: []
                });
            }
            
            const entry = urlMap.get(key);
            entry.positiveFeedback += tx.positiveFeedback;
            entry.negativeFeedback += tx.negativeFeedback;
            
            entry.transactions.push({
                txHash: tx.txHash,
                from: tx.from,
                timestamp: tx.timestamp,
                blockNumber: tx.blockNumber,
                feedbackType: tx.feedbackType
            });
        });
        
        // Convert the map to an array
        const aggregatedResults = Array.from(urlMap.entries()).map(([key, value]) => ({
            articlePage: value.articlePage,
            positiveFeedback: value.positiveFeedback,
            negativeFeedback: value.negativeFeedback,
            transactionCount: value.transactions.length,
            transactions: value.transactions
        }));
        
        console.log(`📊 Aggregated ${transactions.length} transactions into ${aggregatedResults.length} unique URLs`);
        console.log("📊 Aggregation details:", aggregatedResults.map(r => 
            `${r.articlePage}: +${r.positiveFeedback}/-${r.negativeFeedback} (${r.transactionCount} txs)`
        ).join('\n'));
        
        // Add this debug log to verify the final data structure
        console.log("📊 Final aggregated data:", JSON.stringify(aggregatedResults, null, 2));
        
        // Write results to file for debugging (Node.js only)
        if (isNode && aggregatedResults.length > 0) {
            try {
                const outputPath = path.resolve(process.cwd(), 'attestation-results.json');
                fs.writeFileSync(outputPath, JSON.stringify(aggregatedResults, null, 2));
                console.log("📝 Results written to:", outputPath);
            } catch (writeError) {
                console.error("❌ Error writing results to file:", writeError);
            }
        }
        
        return aggregatedResults;
    } catch (error) {
        console.error("❌ Error fetching attestations:", error);
        return [];
    }
};

// Add this to allow running the file directly with Node
if (isNode && process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log("🚀 Running fetchAttestations directly");
    fetchAttestations().then(results => {
        console.log(`✅ Fetched ${results.length} aggregated attestations`);
    }).catch(error => {
        console.error("❌ Error in main execution:", error);
    });
}
