'use client';

import { useEffect, useState } from 'react';
import { clusterApi } from '../services/api';

export default function ApiTestLimits() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [clusterName, setClusterName] = useState('few');
  const [cpuWorker, setCpuWorker] = useState(2);
  const [memoryWorker, setMemoryWorker] = useState('4GB');
  const [cpuControlPlane, setCpuControlPlane] = useState(2);
  const [memoryControlPlane, setMemoryControlPlane] = useState('4GB');

  const applyResourceLimits = async () => {
    try {
      setResult(null);
      setError(null);

      console.log(`Applying resource limits to cluster ${clusterName}...`);
      const response = await clusterApi.setResourceLimits(
        clusterName,
        cpuWorker,
        memoryWorker,
        cpuControlPlane,
        memoryControlPlane
      );

      console.log('Response:', response);
      setResult(response);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Unknown error');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Apply Resource Limits</h1>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Cluster Name:
          <input
            type='text'
            value={clusterName}
            onChange={e => setClusterName(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Worker Node Configuration</h3>
        <div>
          <label>
            CPU Cores:
            <input
              type='number'
              value={cpuWorker}
              onChange={e => setCpuWorker(parseInt(e.target.value) || 1)}
              style={{ marginLeft: '10px', padding: '5px', width: '60px' }}
            />
          </label>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>
            Memory:
            <input
              type='text'
              value={memoryWorker}
              onChange={e => setMemoryWorker(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
          <span style={{ marginLeft: '10px' }}>(e.g., "4GB")</span>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Control Plane Configuration</h3>
        <div>
          <label>
            CPU Cores:
            <input
              type='number'
              value={cpuControlPlane}
              onChange={e => setCpuControlPlane(parseInt(e.target.value) || 1)}
              style={{ marginLeft: '10px', padding: '5px', width: '60px' }}
            />
          </label>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>
            Memory:
            <input
              type='text'
              value={memoryControlPlane}
              onChange={e => setMemoryControlPlane(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
          <span style={{ marginLeft: '10px' }}>(e.g., "4GB")</span>
        </div>
      </div>

      <button
        onClick={applyResourceLimits}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        Apply Resource Limits
      </button>

      {error && (
        <div
          style={{
            marginTop: '20px',
            color: 'red',
            padding: '10px',
            border: '1px solid red',
            borderRadius: '5px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: '20px',
            padding: '10px',
            border: '1px solid green',
            borderRadius: '5px',
          }}
        >
          <h3>Response:</h3>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              backgroundColor: '#f0f0f0',
              padding: '10px',
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
