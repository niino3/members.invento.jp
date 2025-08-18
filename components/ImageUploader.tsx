'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface ImageUploaderProps {
  images: File[];
  onChange: (files: File[]) => void;
  maxImages?: number;
  maxSizeInMB?: number;
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 5,
  maxSizeInMB = 5,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [supportsCameraAPI, setSupportsCameraAPI] = useState(false);

  // モバイルデバイスの検出とカメラAPI対応確認
  useEffect(() => {
    const checkCapabilities = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /android|iphone|ipad|ipod/i.test(userAgent);
      const cameraSupported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      
      setIsMobile(isMobileDevice);
      setSupportsCameraAPI(cameraSupported);
    };
    
    checkCapabilities();
  }, []);

  // 画像プレビューURLの生成
  const generatePreviews = (files: File[]) => {
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    
    // 古いプレビューURLをクリーンアップ
    previews.forEach(preview => URL.revokeObjectURL(preview.url));
    
    setPreviews(newPreviews);
  };

  const validateFile = (file: File): string | null => {
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      return '画像ファイルのみアップロード可能です';
    }

    // ファイルサイズチェック
    const maxSize = maxSizeInMB * 1024 * 1024; // MB to bytes
    if (file.size > maxSize) {
      return `ファイルサイズは${maxSizeInMB}MB以下にしてください`;
    }

    return null;
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // 最大枚数チェック
    const remainingSlots = maxImages - images.length;
    if (fileArray.length > remainingSlots) {
      errors.push(`最大${maxImages}枚まで追加可能です。残り${remainingSlots}枚です。`);
      fileArray.splice(remainingSlots);
    }

    // 各ファイルの検証
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      const newImages = [...images, ...validFiles];
      onChange(newImages);
      generatePreviews(newImages);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    e.target.value = ''; // 同じファイルを再選択できるようにリセット
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // 削除する画像のプレビューURLをクリーンアップ
    URL.revokeObjectURL(previews[index].url);
    
    onChange(newImages);
    setPreviews(newPreviews);
  };

  const openCamera = () => {
    const cameraInput = document.getElementById('camera-input') as HTMLInputElement;
    if (cameraInput) {
      cameraInput.click();
    }
  };

  const openFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        } ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => images.length < maxImages && openFileSelect()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={images.length >= maxImages}
        />
        
        {/* カメラ専用のhidden input */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
          id="camera-input"
          disabled={images.length >= maxImages}
        />
        
        <div className="space-y-1">
          <div className="text-3xl">📷</div>
          <p className="text-sm text-gray-600">
            ドラッグ＆ドロップまたはクリックして画像を選択
          </p>
          <p className="text-xs text-gray-500">
            最大{maxImages}枚、各{maxSizeInMB}MBまで
          </p>
        </div>
      </div>

      {/* カメラボタン */}
      <div className="flex justify-center space-x-2 flex-wrap gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openCamera();
            }}
            disabled={images.length >= maxImages}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📸 カメラで撮影
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openFileSelect();
            }}
            disabled={images.length >= maxImages}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📁 ファイルから選択
          </button>
        </div>
      
      {/* 診断情報（開発用） */}
      <div className="text-xs text-gray-500 text-center">
        モバイル: {isMobile ? '✓' : '✗'} | 
        カメラAPI: {supportsCameraAPI ? '✓' : '✗'} | 
        HTTPS: {typeof window !== 'undefined' && window.location.protocol === 'https:' ? '✓' : '✗'}
      </div>

      {/* プレビューエリア */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  removeImage(index);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
              <p className="mt-1 text-xs text-gray-500 truncate">
                {preview.file.name}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 残り枚数表示 */}
      <p className="text-sm text-gray-500 text-center">
        {images.length}/{maxImages} 枚選択済み
      </p>
    </div>
  );
}