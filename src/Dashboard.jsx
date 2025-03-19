import React, { useEffect, useState } from "react";
import { fetchAttestations } from "./fetchAttestations";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from "recharts";

const Dashboard = () => {
  const [attestations, setAttestations] = useState([]);

  useEffect(() => {
    const getData = async () => {
      const data = await fetchAttestations();
      console.log("Processed Attestations:", data);
      setAttestations(data);
    };
    getData();
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px", maxWidth: "900px", margin: "auto" }}>
      <h2>📊 Web3 Feedback Dashboard</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={attestations} barSize={50}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
  dataKey="articlePage" 
  angle={-15}
  textAnchor="end" 
  tick={{ fontSize: 12, fill: "#ddd" }}
/>
          <YAxis 
            allowDecimals={false} domain={[0, 'dataMax + 1']}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="positiveFeedback" fill="#00C49F" name="Positive Feedback" />
          <Bar dataKey="negativeFeedback" fill="#FF6B6B" name="Negative Feedback" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Dashboard;
