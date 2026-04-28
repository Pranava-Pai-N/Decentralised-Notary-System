"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import axios from "axios";
import { Loader2, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit"

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

interface BlockchainNotaryProps {
  contractAddress: string;
}

export default function BlockchainNotary({
  contractAddress,
}: BlockchainNotaryProps) {
  const [state, setState] = useState<UploadState>({
    fileName: null,
    fileHash: null,
    isHashingFile: false,
    hashError: null,
    txHash: null,
    isSubmittingTx: false,
    txError: null,
    successMessage: null,
  });

  const { isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const { isLoading: isTxConfirming } = useWaitForTransactionReceipt({
    hash: state.txHash as `0x${string}` | undefined,
  });

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
  });

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
            Anchor your documents on the blockchain
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
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

                    <div className="bg-white rounded p-3 mb-3 space-y-2">
                      {state.fileName && (
                        <div>
                          <p className="text-xs text-gray-500">File Name</p>
                          <p className="font-mono text-sm text-gray-900 break-all">
                            {state.fileName}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">File Hash (SHA-256)</p>
                        <p className="font-mono text-sm text-gray-900 break-all">
                          {state.fileHash}
                        </p>
                      </div>
                    </div>

                    {isTxConfirming && (
                      <div className="flex items-center gap-2 text-indigo-700">
                        <Loader2 className="animate-spin" size={16} />
                        <span className="text-sm">
                          Waiting for confirmation...
                        </span>
                      </div>
                    )}
                  </div>
                </div>

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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Anchor Another File
                </button>
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
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Contract Address: {contractAddress}</p>
          <p className="mt-2">
            This application uses SHA-256 hashing and Ethereum blockchain
          </p>
        </div>
      </div>
    </div>
  );
}
