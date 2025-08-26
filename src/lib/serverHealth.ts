// Server health check service for API validation
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export interface ServerHealth {
  openaiAvailable: boolean;
  ideogramAvailable: boolean;
  serverReachable: boolean;
  error?: string;
}

class ServerHealthService {
  private healthCache: ServerHealth | null = null;
  private lastCheck: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  async checkHealth(): Promise<ServerHealth> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.healthCache && (now - this.lastCheck) < this.CACHE_DURATION) {
      return this.healthCache;
    }

    try {
      const response = await fetch(`${SERVER_URL}/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      
      this.healthCache = {
        openaiAvailable: !!data.openai,
        ideogramAvailable: !!data.ideogram,
        serverReachable: true,
      };
      
      this.lastCheck = now;
      return this.healthCache;
      
    } catch (error) {
      console.error('Server health check failed:', error);
      
      this.healthCache = {
        openaiAvailable: false,
        ideogramAvailable: false,
        serverReachable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.lastCheck = now;
      return this.healthCache;
    }
  }

  // Clear cache to force next check
  invalidateCache(): void {
    this.healthCache = null;
    this.lastCheck = 0;
  }

  // Get cached health status without making new request
  getCachedHealth(): ServerHealth | null {
    return this.healthCache;
  }
}

export const serverHealthService = new ServerHealthService();