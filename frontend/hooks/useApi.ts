"use client";

import { useState, useCallback } from "react";
import { api, getErrorMessage } from "@/lib/api";
import type { AxiosRequestConfig } from "axios";

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useApi<T = unknown>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      method: "get" | "post" | "put" | "delete" | "patch",
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const res = await api[method]<T>(url, data as never, config);
        setState({ data: res.data, loading: false, error: null });
        return res.data;
      } catch (err) {
        const message = getErrorMessage(err);
        setState({ data: null, loading: false, error: message });
        throw err;
      }
    },
    []
  );

  const get = useCallback(
    (url: string, config?: AxiosRequestConfig) =>
      execute("get", url, undefined, config),
    [execute]
  );

  const post = useCallback(
    (url: string, data?: unknown, config?: AxiosRequestConfig) =>
      execute("post", url, data, config),
    [execute]
  );

  const put = useCallback(
    (url: string, data?: unknown, config?: AxiosRequestConfig) =>
      execute("put", url, data, config),
    [execute]
  );

  const del = useCallback(
    (url: string, config?: AxiosRequestConfig) =>
      execute("delete", url, undefined, config),
    [execute]
  );

  return { ...state, get, post, put, del };
}
