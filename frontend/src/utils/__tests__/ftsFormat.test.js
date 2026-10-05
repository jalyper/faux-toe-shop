import { describe, it, expect, vi } from 'vitest';
import {
  serializeProject,
  deserializeProject,
  downloadFtsFile,
  readFtsFile,
  isFileSystemAccessSupported,
  getCurrentFileHandle,
  setCurrentFileHandle
} from '../ftsFormat';

describe('ftsFormat', () => {
  const mockLayers = [
    {
      id: 'background',
      name: 'Background',
      type: 'background',
      visible: true,
      locked: false,
      opacity: 100,
      isBackground: true,
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0
      }
    },
    {
      id: 'layer-1',
      name: 'Layer 1',
      type: 'layer',
      visible: true,
      locked: false,
      opacity: 80,
      isBackground: false,
      adjustments: {
        brightness: 10,
        contrast: 5,
        saturation: 0,
        blur: 0
      }
    }
  ];

  describe('serializeProject', () => {
    it('should serialize project to valid JSON', () => {
      const result = serializeProject({
        canvas: { width: 1200, height: 800 },
        layers: mockLayers,
        activeLayerId: 'layer-1',
        canvasJSON: '{"test": "data"}',
        backgroundColor: '#ffffff'
      });

      const parsed = JSON.parse(result);
      expect(parsed.version).toBe('1.0');
      expect(parsed.format).toBe('fts');
      expect(parsed.canvas.width).toBe(1200);
      expect(parsed.canvas.height).toBe(800);
      expect(parsed.layers).toHaveLength(2);
      expect(parsed.activeLayerId).toBe('layer-1');
      expect(parsed.canvasData).toBe('{"test": "data"}');
    });

    it('should include metadata with timestamps', () => {
      const result = serializeProject({
        canvas: { width: 1200, height: 800 },
        layers: mockLayers,
        activeLayerId: 'background',
        backgroundColor: '#ffffff'
      });

      const parsed = JSON.parse(result);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.created).toBeDefined();
      expect(parsed.metadata.modified).toBeDefined();
      expect(parsed.metadata.appVersion).toBe('0.1.0');
    });

    it('should use default values when not provided', () => {
      const result = serializeProject({
        canvas: {},
        layers: [],
        activeLayerId: null,
        backgroundColor: null
      });

      const parsed = JSON.parse(result);
      expect(parsed.canvas.width).toBe(1200);
      expect(parsed.canvas.height).toBe(800);
      expect(parsed.canvas.backgroundColor).toBe('#ffffff');
    });
  });

  describe('deserializeProject', () => {
    it('should deserialize valid FTS project', () => {
      const projectJson = JSON.stringify({
        version: '1.0',
        format: 'fts',
        canvas: { width: 1920, height: 1080, backgroundColor: '#000000' },
        layers: mockLayers,
        activeLayerId: 'layer-1',
        canvasData: '{"test": "canvas"}',
        metadata: {
          created: '2024-01-01T00:00:00Z',
          modified: '2024-01-02T00:00:00Z',
          appVersion: '0.1.0'
        }
      });

      const result = deserializeProject(projectJson);
      expect(result.canvas.width).toBe(1920);
      expect(result.canvas.height).toBe(1080);
      expect(result.layers).toHaveLength(2);
      expect(result.activeLayerId).toBe('layer-1');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => deserializeProject('not valid json'))
        .toThrow('Invalid FTS file: Unable to parse JSON');
    });

    it('should throw error for wrong format', () => {
      const wrongFormat = JSON.stringify({
        version: '1.0',
        format: 'psd',
        canvas: {},
        layers: []
      });

      expect(() => deserializeProject(wrongFormat))
        .toThrow("Invalid file format. Expected 'fts', got 'psd'");
    });

    it('should throw error for incompatible version', () => {
      const wrongVersion = JSON.stringify({
        version: '2.0',
        format: 'fts',
        canvas: {},
        layers: []
      });

      expect(() => deserializeProject(wrongVersion))
        .toThrow('Incompatible FTS version');
    });

    it('should provide defaults for missing fields', () => {
      const minimalProject = JSON.stringify({
        version: '1.0',
        format: 'fts'
      });

      const result = deserializeProject(minimalProject);
      expect(result.canvas.width).toBe(1200);
      expect(result.canvas.height).toBe(800);
      expect(result.layers).toEqual([]);
      expect(result.activeLayerId).toBeNull();
    });
  });

  describe('downloadFtsFile', () => {
    it('should create and trigger download link', () => {
      const mockClick = vi.fn();
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
      const mockRevokeObjectURL = vi.fn();

      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      downloadFtsFile('{"test": "content"}', 'my-project');

      expect(mockLink.download).toBe('my-project.fts');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Cleanup
      vi.restoreAllMocks();
    });
  });

  describe('readFtsFile', () => {
    it('should reject files without .fts extension', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(readFtsFile(file))
        .rejects.toThrow('Invalid file type. Please select an .fts file');
    });

    it('should parse valid .fts file', async () => {
      const projectData = {
        version: '1.0',
        format: 'fts',
        canvas: { width: 1200, height: 800, backgroundColor: '#ffffff' },
        layers: mockLayers,
        activeLayerId: 'background'
      };

      const file = new File(
        [JSON.stringify(projectData)],
        'test.fts',
        { type: 'application/json' }
      );

      const result = await readFtsFile(file);
      expect(result.version).toBe('1.0');
      expect(result.layers).toHaveLength(2);
    });
  });

  describe('File System Access API helpers', () => {
    it('should check if File System Access API is supported', () => {
      // In test environment, this will be false
      const result = isFileSystemAccessSupported();
      expect(typeof result).toBe('boolean');
    });

    it('should get and set current file handle', () => {
      // Initially null
      expect(getCurrentFileHandle()).toBeNull();

      // Set a mock handle
      const mockHandle = { name: 'test.fts' };
      setCurrentFileHandle(mockHandle);
      expect(getCurrentFileHandle()).toBe(mockHandle);

      // Reset
      setCurrentFileHandle(null);
      expect(getCurrentFileHandle()).toBeNull();
    });
  });
});
