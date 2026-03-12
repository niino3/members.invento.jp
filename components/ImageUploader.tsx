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
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // モバイルデバイスの検出とカメラAPI対応確認
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobileDevice = /android|iphone|ipad|ipod/i.test(userAgent);
    const cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    setIsMobile(isMobileDevice);
    setSupportsCameraAPI(cameraSupported);
  }, []);

  // 画像プレビューの管理
  useEffect(() => {
    // 既存のプレビューURLをクリーンアップ
    previews.forEach(preview => {
      if (preview.url.startsWith('blob:')) {
        URL.revokeObjectURL(preview.url);
      }
    });
    
    const newPreviews = images.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));
    
    setPreviews(newPreviews);
    
    // クリーンアップ関数
    return () => {
      newPreviews.forEach(preview => {
        if (preview.url.startsWith('blob:')) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [images]);

  // クリーンアップ: コンポーネントがアンマウントされる時にカメラを停止
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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

    try {
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
        console.error('File validation errors:', errors);
        alert(errors.join('\n'));
      }

      if (validFiles.length > 0) {
        const newImages = [...images, ...validFiles];
        onChange(newImages);
      }
    } catch (error) {
      console.error('Error handling file selection:', error);
      alert('ファイル処理中にエラーが発生しました');
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
    onChange(newImages);
  };

  const startCamera = async () => {
    if (!supportsCameraAPI) {
      openFileSelect();
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment' // 背面カメラを優先
        }
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      
      // ビデオ要素にストリームを設定
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error('Camera access failed:', error);
      // カメラアクセスが失敗した場合はファイル選択にフォールバック
      openFileSelect();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // キャンバスサイズを動画サイズに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 動画フレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // キャンバスからBlobを作成
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        const newImages = [...images, file];
        onChange(newImages);
        
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const openFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={images.length >= maxImages}
      />

      {/* カメラボタン */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            startCamera();
          }}
          disabled={images.length >= maxImages}
          className="inline-flex items-center px-6 py-3 text-base font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📸 {supportsCameraAPI ? 'カメラで撮影' : '写真を選択'}
        </button>
      </div>

      {/* プレビューエリア */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              <div className="w-full overflow-hidden rounded bg-gray-100" style={{ aspectRatio: '1/1' }}>
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

      {/* カメラモーダル */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full h-full max-w-none m-0 sm:max-w-4xl sm:h-auto sm:m-4 sm:rounded-lg flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">カメラで撮影</h3>
              <button
                type="button"
                onClick={stopCamera}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                ✕
              </button>
            </div>

            <div className="relative flex-1 min-h-0">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full bg-black rounded object-contain sm:max-h-[70vh]"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>

            <div className="flex justify-center space-x-4 mt-4 pb-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-6 py-3 text-base font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-3 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                📸 撮影
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}