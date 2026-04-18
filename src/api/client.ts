import axios from 'axios';

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL,
  timeout: 10000,
});
