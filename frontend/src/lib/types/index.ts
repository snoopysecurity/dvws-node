export interface User {
  username: string;
  bio?: string;
  role: string;
  isAdmin?: boolean;
}

export interface Note {
  name: string;
  type: string;
  body: string;
  createdAt?: string;
}

export interface Passphrase {
  reminder: string;
  passphrase: string;
  createdAt?: string;
}

export interface FileInfo {
  filename: string;
  size?: number;
  uploadedAt?: string;
}
