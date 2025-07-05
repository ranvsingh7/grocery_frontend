"use client";

import React, { useState } from "react";
import { apiRequest } from "@/utils/api";
import { getDecodedToken } from "@/utils/auth";
import { CustomJwtPayload } from "@/types/types";


const TestUploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  let token: string | null = null;
    let userId: string | null = null;
  
    // Initialize token and userId in a global scope
    const initializeAuth = () => {
      const decoded = getDecodedToken<CustomJwtPayload>("token");
      userId = decoded?.id || null;
      token = decoded
        ? document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1")
        : null;
    };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadedUrl(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
        initializeAuth();
        if (!token) {
            setError("Token is missing.");
            setUploading(false);
            return;
            }
      const data = await apiRequest<{ url: string }>(
        "/api/upload-image",
        "POST",
        formData
        , token
      );
      setUploadedUrl(data.url);
    } catch (err: any) {
      setError(err.message || "An error occurred while uploading the image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Test Image Upload</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Image"}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {uploadedUrl && (
        <div className="mt-4">
          <p className="text-green-500">Image uploaded successfully!</p>
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            View Uploaded Image
          </a>
        </div>
      )}
    </div>
  );
};

export default TestUploadPage;
