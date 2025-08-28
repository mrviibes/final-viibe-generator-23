import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Palette, Download, Type, X } from 'lucide-react';

interface ExactTextOverlayProps {
  imageUrl: string;
  originalText: string;
  onClose: () => void;
  onSave: (finalImageUrl: string) => void;
}

export function ExactTextOverlay({ imageUrl, originalText, onClose, onSave }: ExactTextOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState(originalText);
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState('#ffffff');
  const [position, setPosition] = useState({ x: 20, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadImageAndRender();
  }, [imageUrl, text, fontSize, textColor, position]);

  const loadImageAndRender = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw text
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.strokeStyle = textColor === '#ffffff' ? '#000000' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Add text outline for better contrast
      ctx.strokeText(text, position.x, position.y);
      ctx.fillText(text, position.x, position.y);
    };
    
    img.src = imageUrl;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check if click is near text
    const textWidth = text.length * fontSize * 0.6; // Rough estimate
    if (mouseX >= position.x && mouseX <= position.x + textWidth &&
        mouseY >= position.y && mouseY <= position.y + fontSize) {
      setIsDragging(true);
      setDragOffset({
        x: mouseX - position.x,
        y: mouseY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    setPosition({
      x: Math.max(0, Math.min(canvas.width - 200, mouseX - dragOffset.x)),
      y: Math.max(0, Math.min(canvas.height - fontSize, mouseY - dragOffset.y))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        onSave(url);
      }
    }, 'image/png');
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'exact-text-image.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Exact Text Caption Editor</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Text Content</label>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter your text"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Font Size</label>
                <Input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value) || 32)}
                  min="12"
                  max="120"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Text Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-16 h-9 p-1 border-2"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTextColor(textColor === '#ffffff' ? '#000000' : '#ffffff')}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                <Type className="h-4 w-4 inline mr-1" />
                Click and drag the text to reposition it
              </p>
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto border bg-white cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleSave}>
                Save & Use This Image
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}