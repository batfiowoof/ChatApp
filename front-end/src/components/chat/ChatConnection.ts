import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";

class ChatConnection {
  private connection: signalR.HubConnection | null = null;
  private token: string | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // We'll initialize the connection only when needed
  }

  public async connect(token?: string): Promise<signalR.HubConnection> {
    // Try to get the token from parameter, cookie, or localStorage in that order
    const authToken =
      token || Cookies.get("token") || localStorage.getItem("token");

    if (!authToken) {
      throw new Error("No authentication token available");
    }

    if (this.connection && this.token === authToken) {
      return this.connection;
    }

    // Store token for reconnection purposes
    this.token = authToken;

    // Create a new connection
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5225/hubs/chat", {
        accessTokenFactory: () => authToken,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Start the connection if not already started
    if (this.connectionPromise === null) {
      this.connectionPromise = this.connection.start();
    }

    try {
      await this.connectionPromise;
      console.log("Connected to SignalR hub!");
      return this.connection;
    } catch (err) {
      console.error("Failed to connect to SignalR hub:", err);
      this.connectionPromise = null;
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      this.connectionPromise = null;
      this.token = null;
      console.log("Disconnected from SignalR hub");
    }
  }

  public getConnection(): signalR.HubConnection | null {
    return this.connection;
  }

  public isConnected(): boolean {
    return (
      this.connection !== null &&
      this.connection.state === signalR.HubConnectionState.Connected
    );
  }
}

// Export a singleton instance
export const chatConnection = new ChatConnection();
