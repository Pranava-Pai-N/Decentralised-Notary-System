"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from "wagmi";
import axios from "axios";
import { Loader2, CheckCircle2, AlertCircle, Upload, ShieldCheck, ShieldAlert, Copy, Download } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit"
import QRCode from "qrcode.react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";


const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_fileHash",
        "type": "bytes32"
      }
    ],
    "name": "anchorHash",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "fileHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "uploader",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "HashAnchored",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_fileHash",
        "type": "bytes32"
      }
    ],
    "name": "getHashDetails",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "uploader",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct DocumentNotary.Record",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_fileHash",
        "type": "bytes32"
      }
    ],
    "name": "getTimestamp",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_fileHash",
        "type": "bytes32"
      }
    ],
    "name": "getUploader",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_fileHash",
        "type": "bytes32"
      }
    ],
    "name": "hashExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "records",
    "outputs": [
      {
        "internalType": "address",
        "name": "uploader",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface UploadState {
  fileName: string | null;
  fileHash: string | null;
  isHashingFile: boolean;
  hashError: string | null;
  txHash: string | null;
  isSubmittingTx: boolean;
  txError: string | null;
  successMessage: string | null;
}

interface VerifyState {
  fileName: string | null;
  fileHash: string | null;
  isHashingFile: boolean;
  hashError: string | null;
  isVerifying: boolean;
  verifyError: string | null;
  verifyResult: {
    exists: boolean;
    uploader: string | null;
    timestamp: number | null;
    formattedDate: string | null;
  } | null;
}

interface BlockchainNotaryProps {
  contractAddress: string;
}

export default function BlockchainNotary({
  contractAddress,
}: BlockchainNotaryProps) {
  const [activeTab, setActiveTab] = useState<"anchor" | "verify">("anchor");
  const [state, setState] = useState<UploadState>({
    fileName: null,
    fileHash: null,
    isHashingFile: false,
    hashError: null,
    txHash: "",
    isSubmittingTx: false,
    txError: null,
    successMessage: null,
  });

  const [verifyState, setVerifyState] = useState<VerifyState>({
    fileName: null,
    fileHash: null,
    isHashingFile: false,
    hashError: null,
    isVerifying: false,
    verifyError: null,
    verifyResult: null,
  });

  const receiptRef = useRef<HTMLDivElement>(null);

  const { isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const { isLoading: isTxConfirming } = useWaitForTransactionReceipt({
    hash: state.txHash as `0x${string}` | undefined,
  });

  const formatTimestamp = (unixTimestamp: number): string => {
    try {
      const date = new Date(unixTimestamp * 1000);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    window.navigator.clipboard.writeText(text)
  };

  const getEtherscanUrl = (txHash: string): string => {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  const downloadReceipt = async () => {
    if (!state.txHash || !state.fileHash) return;

    try {
      const qrElement = document.querySelector('canvas[style*="display"]') as HTMLCanvasElement;
      let qrImageData: string | null = null;
      
      if (qrElement) {
        qrImageData = qrElement.toDataURL('image/png');
      }

      const canvas = document.createElement('canvas');
      const width = 600;
      const height = qrImageData ? 900 : 700;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Blockchain Notary Receipt', 30, 50);

      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      const dateStr = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      ctx.fillText(dateStr, 30, 75);

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 90);
      ctx.lineTo(570, 90);
      ctx.stroke();

      let yPos = 130;

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('FILE NAME', 30, yPos);
      yPos += 20;

      ctx.fillStyle = '#111827';
      ctx.font = '12px Courier New';
      const fileNameText = state.fileName || 'N/A';
      const maxCharsPerLine = 60;
      let currentIndex = 0;
      while (currentIndex < fileNameText.length) {
        const chunk = fileNameText.slice(currentIndex, currentIndex + maxCharsPerLine);
        ctx.fillText(chunk, 30, yPos);
        yPos += 20;
        currentIndex += maxCharsPerLine;
      }

      yPos += 10;

      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('FILE HASH (SHA-256)', 30, yPos);
      yPos += 20;

      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(30, yPos - 15, 540, 80);
      ctx.fillStyle = '#111827';
      ctx.font = '10px Courier New';
      
      const hashLines = state.fileHash.match(/.{1,70}/g) || [];
      hashLines.forEach((line, index) => {
        ctx.fillText(line, 40, yPos + index * 18);
      });
      yPos += 95;

      if (qrImageData) {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, yPos);
        ctx.lineTo(570, yPos);
        ctx.stroke();
        yPos += 25;

        ctx.fillStyle = '#6b7280';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('TRANSACTION QR CODE', 30, yPos);
        yPos += 25;

        const qrImage = new Image();
        qrImage.onload = () => {
          ctx.drawImage(qrImage, 240, yPos, 120, 120);
          
          yPos += 140;
          
          ctx.fillStyle = '#6b7280';
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Scan to view on Sepolia Etherscan', width / 2, yPos);
          yPos += 20;

          ctx.textAlign = 'left';
          ctx.fillStyle = '#6b7280';
          ctx.font = 'bold 10px Arial';
          ctx.fillText('TRANSACTION HASH', 30, yPos);
          yPos += 15;

          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 11px Arial';
          ctx.fillText('Transaction Confirmed', 30, yPos);

          ctx.fillStyle = '#9ca3af';
          ctx.font = '9px Arial';
          ctx.fillText(`Generated: ${new Date().toISOString()}`, 30, height - 20);

          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = `blockchain-receipt-${state.fileName}.png`;
          link.click();
        };
        qrImage.src = qrImageData;
      } else {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, yPos);
        ctx.lineTo(570, yPos);
        ctx.stroke();
        yPos += 25;

        ctx.fillStyle = '#6b7280';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('TRANSACTION HASH', 30, yPos);
        yPos += 20;

        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(30, yPos - 15, 540, 60);
        ctx.fillStyle = '#111827';
        ctx.font = '9px Courier New';
        ctx.fillText(state.txHash, 40, yPos + 15);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('✓ Transaction Confirmed', 30, yPos + 45);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '9px Arial';
        ctx.fillText(`Generated: ${new Date().toISOString()}`, 30, height - 20);

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `blockchain-notary-receipt-${Date.now()}.png`;
        link.click();
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
      alert('Failed to download receipt. Please try again.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isConnected) {
      setState(prev => ({ ...prev, hashError: "Please connect your wallet first." }));
      return;
    }

    if (acceptedFiles.length === 0) {
      setState((prev) => ({
        ...prev,
        hashError: "No file selected",
      }));
      return;
    }

    const file = acceptedFiles[0];


    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setState((prev) => ({
        ...prev,
        hashError: "Invalid file type. Please upload PDF, PNG, or JPG.",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isHashingFile: true,
      hashError: null,
      fileName: file.name,
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${BACKEND_URL}/hash-document`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        const hash = response.data.hash;
        setState((prev) => ({
          ...prev,
          fileHash: hash,
          isHashingFile: false,
          isSubmittingTx: true,
          txError: null,
        }));

        const hashBytes32 = hash as `0x${string}`;

        try {
          writeContract(
            {
              address: contractAddress as `0x${string}`,
              abi: CONTRACT_ABI,
              functionName: "anchorHash",
              args: [hashBytes32],
            },
            {
              onSuccess: (data) => {
                setState((prev) => ({
                  ...prev,
                  txHash: data,
                  isSubmittingTx: false,
                }));
              },
              onError: (err: any) => {
                setState((prev) => ({
                  ...prev,
                  txError: err.shortMessage || err.message || "User rejected request",
                  isSubmittingTx: false,
                }));
              },
            }
          );
        }
        catch (err: any) {
          setState((prev) => ({
            ...prev,
            txError: err.message || "Failed to submit transaction",
            isSubmittingTx: false,
          }));
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to hash file";
      setState((prev) => ({
        ...prev,
        hashError: errorMessage,
        isHashingFile: false,
      }));
    }
  }, [isConnected, contractAddress, writeContract]);


  const onVerifyDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      setVerifyState((prev) => ({
        ...prev,
        hashError: "No file selected",
      }));
      return;
    }

    const file = acceptedFiles[0];
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      setVerifyState((prev) => ({
        ...prev,
        hashError: "Invalid file type. Please upload PDF, PNG, or JPG.",
      }));
      return;
    }

    setVerifyState((prev) => ({
      ...prev,
      isHashingFile: true,
      hashError: null,
      fileName: file.name,
      verifyError: null,
      verifyResult: null,
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${BACKEND_URL}/hash-document`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        const hash = response.data.hash;
        setVerifyState((prev) => ({
          ...prev,
          fileHash: hash,
          isHashingFile: false,
          isVerifying: true,
        }));

        const hashBytes32 = hash as `0x${string}`;

        try {
          const provider = window.ethereum;
          if (!provider) {
            throw new Error("Web3 provider not found");
          }

          const result = await (window as any).ethereum.request({
            method: 'eth_call',
            params: [
              {
                to: contractAddress,
                data: encodeGetHashDetailsCall(hashBytes32),
              },
              'latest',
            ],
          });

          const { uploader, timestamp } = decodeHashDetails(result);

          setVerifyState((prev) => ({
            ...prev,
            isVerifying: false,
            verifyResult: {
              exists: uploader !== '0x0000000000000000000000000000000000000000',
              uploader: uploader !== '0x0000000000000000000000000000000000000000' ? uploader : null,
              timestamp: timestamp > 0 ? timestamp : null,
              formattedDate: timestamp > 0 ? formatTimestamp(timestamp) : null,
            },
          }));
        } catch (err: any) {
          setVerifyState((prev) => ({
            ...prev,
            isVerifying: false,
            verifyError: err.message || "Failed to verify hash",
          }));
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to hash file";
      setVerifyState((prev) => ({
        ...prev,
        hashError: errorMessage,
        isHashingFile: false,
      }));
    }
  }, [contractAddress]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  });

  const { getRootProps: getVerifyRootProps, getInputProps: getVerifyInputProps, isDragActive: isVerifyDragActive } = useDropzone({
    onDrop: onVerifyDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  });

  const encodeGetHashDetailsCall = (hash: `0x${string}`): string => {
    const functionSelector = '0xc21b9b5e';
    return functionSelector + hash.slice(2).padStart(64, '0');
  };

  const decodeHashDetails = (data: string): { uploader: string; timestamp: number } => {
    try {

      const uploader = '0x' + data.slice(26, 66);
      const timestampHex = '0x' + data.slice(66, 130);
      const timestamp = parseInt(timestampHex, 16);
      return { uploader, timestamp };
    } catch {
      return { uploader: '0x0000000000000000000000000000000000000000', timestamp: 0 };
    }
  };

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center py-4">
          <ConnectButton />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Blockchain Notary
          </h1>
          <p className="text-lg text-gray-600">
            Anchor and verify your documents on the blockchain
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("anchor")}
              className={`flex-1 py-4 px-6 font-semibold text-center transition-colors ${activeTab === "anchor"
                ? "bg-indigo-600 text-white border-b-2 border-indigo-600"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
            >
              Anchor New
            </button>
            <button
              onClick={() => setActiveTab("verify")}
              className={`flex-1 py-4 px-6 font-semibold text-center transition-colors ${activeTab === "verify"
                ? "bg-indigo-600 text-white border-b-2 border-indigo-600"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
            >
              Verify Document
            </button>
          </div>

          <div className="p-8">
            {activeTab === "anchor" && (
              <>
                {!state.fileHash && (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragActive
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-300 hover:border-indigo-400"
                      }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                    {isDragActive ? (
                      <p className="text-indigo-600 font-semibold">
                        Drop your file here...
                      </p>
                    ) : (
                      <>
                        <p className="text-gray-700 font-semibold mb-2">
                          Drag and drop your file here
                        </p>
                        <p className="text-gray-500 text-sm">
                          or click to select a file (PDF, PNG, JPG)
                        </p>
                      </>
                    )}
                  </div>
                )}

                {state.isHashingFile && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <p className="text-gray-700 font-semibold">
                      Processing your file...
                    </p>
                    {state.fileName && (
                      <p className="text-gray-500 text-sm mt-2">{state.fileName}</p>
                    )}
                  </div>
                )}

                {state.hashError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">Error</p>
                      <p className="text-red-700 text-sm">{state.hashError}</p>
                    </div>
                  </div>
                )}

                {state.isSubmittingTx && state.fileHash && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <p className="text-gray-700 font-semibold">
                      Confirming blockchain transaction...
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      File Hash: {state.fileHash.slice(0, 10)}...
                    </p>
                  </div>
                )}

                {state.fileHash &&
                  !state.isHashingFile &&
                  !state.isSubmittingTx &&
                  !state.hashError && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start gap-4">
                        <CheckCircle2 className="text-green-600 mt-0.5 flex-shrink-0" size={24} />
                        <div className="flex-1">
                          <p className="font-semibold text-green-900 mb-1">
                            Successfully Anchored
                          </p>
                          <p className="text-green-700 text-sm mb-3">
                            Your document has been securely recorded on the blockchain.
                          </p>

                          <div
                            ref={receiptRef}
                            className="bg-white rounded-lg p-4 space-y-4"
                            style={{ background: '#ffffff' }}
                          >
                            <div className="border-b pb-3">
                              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Blockchain Notary Receipt
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date().toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </p>
                            </div>

                            {state.fileName && (
                              <div>
                                <p className="text-xs text-gray-500 font-semibold">FILE NAME</p>
                                <p className="font-mono text-xs text-gray-900 break-all mt-1">
                                  {state.fileName}
                                </p>
                              </div>
                            )}

                            <div>
                              <p className="text-xs text-gray-500 font-semibold">FILE HASH (SHA-256)</p>
                              <p className="font-mono text-xs text-gray-900 break-all mt-1">
                                {state.fileHash}
                              </p>
                            </div>

                            {state.txHash && !isTxConfirming && (
                              <div className="flex flex-col items-center py-4 border-t">
                                <p className="text-xs text-gray-500 font-semibold mb-3">
                                  TRANSACTION DETAILS
                                </p>
                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                  <QRCode
                                    value={getEtherscanUrl(state.txHash)}
                                    size={120}
                                    level="H"
                                    includeMargin={true}
                                    fgColor="#000000"
                                    bgColor="#ffffff"
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-3 text-center">
                                  Scan to view on Sepolia Etherscan
                                </p>
                                <p className="font-mono text-xs text-gray-700 break-all mt-2">
                                  TX: {state.txHash.slice(0, 16)}...
                                </p>
                              </div>
                            )}

                            {isTxConfirming && (
                              <div className="flex flex-col items-center justify-center py-4 border-t">
                                <Loader2 className="animate-spin text-indigo-600 mb-2" size={20} />
                                <p className="text-xs text-indigo-700 font-semibold">
                                  Confirming transaction...
                                </p>
                              </div>
                            )}
                          </div>

                          {state.txHash && !isTxConfirming && (
                            <div className="mt-4 pt-3 border-t">
                              <div className="flex items-center gap-2 text-green-700 bg-green-100 rounded px-3 py-2 text-xs font-semibold">
                                <CheckCircle2 size={16} />
                                <span>Transaction confirmed on blockchain</span>
                              </div>
                            </div>
                          )}

                          {isTxConfirming && (
                            <div className="flex items-center gap-2 text-indigo-700 mt-3">
                              <Loader2 className="animate-spin" size={16} />
                              <span className="text-sm">
                                Waiting for confirmation...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {state.txHash && !isTxConfirming && (
                          <>
                            <button
                              onClick={downloadReceipt}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Download size={18} />
                              Download Receipt
                            </button>
                            <button
                              onClick={() =>
                                window.open(getEtherscanUrl(state.txHash!), '_blank')
                              }
                              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                              View on Etherscan
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            setState({
                              fileName: null,
                              fileHash: null,
                              isHashingFile: false,
                              hashError: null,
                              txHash: null,
                              isSubmittingTx: false,
                              txError: null,
                              successMessage: null,
                            })
                          }
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Anchor Another File
                        </button>
                      </div>
                    </div>
                  )}

                {state.txError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">Transaction Error</p>
                      <p className="text-red-700 text-sm">{state.txError}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "verify" && (
              <>
                {!verifyState.fileHash && (
                  <div
                    {...getVerifyRootProps()}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isVerifyDragActive
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-300 hover:border-indigo-400"
                      }`}
                  >
                    <input {...getVerifyInputProps()} />
                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                    {isVerifyDragActive ? (
                      <p className="text-indigo-600 font-semibold">
                        Drop your file here...
                      </p>
                    ) : (
                      <>
                        <p className="text-gray-700 font-semibold mb-2">
                          Drag and drop your file to verify
                        </p>
                        <p className="text-gray-500 text-sm">
                          or click to select a file (PDF, PNG, JPG)
                        </p>
                      </>
                    )}
                  </div>
                )}

                {verifyState.isHashingFile && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <p className="text-gray-700 font-semibold">
                      Processing your file...
                    </p>
                    {verifyState.fileName && (
                      <p className="text-gray-500 text-sm mt-2">{verifyState.fileName}</p>
                    )}
                  </div>
                )}

                {verifyState.isVerifying && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <p className="text-gray-700 font-semibold">
                      Verifying on blockchain...
                    </p>
                    {verifyState.fileHash && (
                      <p className="text-gray-500 text-sm mt-2">
                        Hash: {verifyState.fileHash.slice(0, 12)}...
                      </p>
                    )}
                  </div>
                )}

                {verifyState.hashError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">Error</p>
                      <p className="text-red-700 text-sm">{verifyState.hashError}</p>
                    </div>
                  </div>
                )}

                {verifyState.verifyError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">Verification Error</p>
                      <p className="text-red-700 text-sm">{verifyState.verifyError}</p>
                    </div>
                  </div>
                )}

                {verifyState.verifyResult && !verifyState.isVerifying && (
                  <div className="space-y-4">
                    {verifyState.verifyResult.exists ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start gap-4">
                        <ShieldCheck className="text-green-600 mt-0.5 flex-shrink-0" size={28} />
                        <div className="flex-1">
                          <p className="font-bold text-green-900 text-lg mb-3 flex items-center gap-2">
                            <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                              VERIFIED
                            </span>
                          </p>
                          <p className="text-green-700 text-sm mb-4">
                            This document has been successfully anchored to the blockchain.
                          </p>

                          <div className="bg-white rounded-lg p-4 space-y-3">
                            {verifyState.fileName && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">File Name</p>
                                <p className="text-sm text-gray-900 font-mono break-all">
                                  {verifyState.fileName}
                                </p>
                              </div>
                            )}

                            <div className="border-t pt-3">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Hash (SHA-256)</p>
                              <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                <p className="text-xs text-gray-700 font-mono truncate">
                                  {verifyState.fileHash}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(verifyState.fileHash || '')}
                                  className="ml-2 p-1.5 hover:bg-gray-200 rounded transition"
                                  title="Copy to clipboard"
                                >
                                  <Copy size={16} className="text-gray-600" />
                                </button>
                              </div>
                            </div>

                            {verifyState.verifyResult.uploader && (
                              <div className="border-t pt-3">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Uploaded By</p>
                                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                  <p className="text-sm text-gray-900 font-mono">
                                    {formatAddress(verifyState.verifyResult.uploader)}
                                  </p>
                                  <button
                                    onClick={() => copyToClipboard(verifyState.verifyResult?.uploader || '')}
                                    className="ml-2 p-1.5 hover:bg-gray-200 rounded transition"
                                    title="Copy to clipboard"
                                  >
                                    <Copy size={16} className="text-gray-600" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {verifyState.verifyResult.formattedDate && (
                              <div className="border-t pt-3">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Anchor Time</p>
                                <p className="text-sm text-gray-900 font-mono">
                                  {verifyState.verifyResult.formattedDate}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex items-start gap-4">
                        <ShieldAlert className="text-amber-600 mt-0.5 flex-shrink-0" size={28} />
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 text-lg mb-3 flex items-center gap-2">
                            <span className="inline-block bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                              NOT FOUND
                            </span>
                          </p>
                          <p className="text-amber-700 text-sm mb-4">
                            This document hash has not been found on the blockchain. It either hasn't been anchored yet or may be a different document.
                          </p>

                          {verifyState.fileHash && (
                            <div className="bg-white rounded-lg p-4">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Hash (SHA-256)</p>
                              <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                                <p className="text-xs text-gray-700 font-mono truncate">
                                  {verifyState.fileHash}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(verifyState.fileHash || '')}
                                  className="ml-2 p-1.5 hover:bg-gray-200 rounded transition"
                                  title="Copy to clipboard"
                                >
                                  <Copy size={16} className="text-gray-600" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() =>
                        setVerifyState({
                          fileName: null,
                          fileHash: null,
                          isHashingFile: false,
                          hashError: null,
                          isVerifying: false,
                          verifyError: null,
                          verifyResult: null,
                        })
                      }
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Verify Another File
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Contract Address: {contractAddress}</p>
          <p className="mt-2">
            This application uses SHA-256 hashing and Ethereum blockchain
          </p>
        </div>

        <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
          <div
            ref={receiptRef}
            style={{
              width: '450px',
              padding: '40px',
              backgroundColor: '#ffffff',
              color: '#111827',
              fontFamily: 'sans-serif',
              lineHeight: '1.5'
            }}
          >
            <div style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#4f46e5', margin: '0' }}>
                Medical Notary Receipt
              </h2>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0 0' }}>
                {new Date().toLocaleString()}
              </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', margin: '0 0 4px 0' }}>File Name</p>
              <p style={{ fontSize: '13px', color: '#111827', wordBreak: 'break-all', margin: '0' }}>{state.fileName}</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', margin: '0 0 4px 0' }}>File Hash (SHA-256)</p>
              <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#111827', wordBreak: 'break-all', margin: '0' }}>{state.fileHash}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Transaction Hash</p>
              <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#4f46e5', wordBreak: 'break-all', margin: '0' }}>{state.txHash}</p>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'inline-block', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                <QRCode
                  value={state.txHash ? getEtherscanUrl(state.txHash) : ""}
                  size={140}
                  level="H"
                  includeMargin={false}
                  fgColor="#000000"
                  bgColor="#f9fafb"
                />
              </div>
              <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '10px' }}>
                Verified on Ethereum Sepolia Testnet
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
