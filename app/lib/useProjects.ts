"use client";
import { useState, useEffect, useCallback } from "react";
import { signuxFetch } from "./api-client";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  summary: string;
  conversation_count: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

const STORAGE_KEY = "signux_active_project";

export function useProjects(isLoggedIn: boolean) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load active project from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setActiveProjectId(saved);
  }, []);

  // Fetch projects when logged in
  useEffect(() => {
    if (!isLoggedIn) { setProjects([]); return; }
    setLoading(true);
    signuxFetch("/api/projects")
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const selectProject = useCallback((id: string | null) => {
    setActiveProjectId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const createProject = useCallback(async (name: string, description?: string, color?: string) => {
    try {
      const res = await signuxFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, color }),
      });
      const project = await res.json();
      if (project?.id) {
        setProjects(prev => [project, ...prev]);
        selectProject(project.id);
        return project;
      }
    } catch {}
    return null;
  }, [selectProject]);

  const updateProject = useCallback(async (id: string, updates: Partial<Pick<Project, "name" | "description" | "color" | "archived">>) => {
    try {
      const res = await signuxFetch("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id, ...updates }),
      });
      const updated = await res.json();
      if (updated?.id) {
        setProjects(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch {}
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  return {
    projects,
    activeProject,
    activeProjectId,
    loading,
    selectProject,
    createProject,
    updateProject,
  };
}
