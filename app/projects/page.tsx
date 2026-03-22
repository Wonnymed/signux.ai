"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, Plus, Search, ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useProjects } from "../lib/useProjects";
import { useIsMobile } from "../lib/useIsMobile";
import Sidebar from "../components/Sidebar";
import { PageHeader, EmptyState } from "../components/PageShell";

export default function ProjectsPage() {
  const router = useRouter();
  const { authUser } = useAuth();
  const isMobile = useIsMobile();
  const { projects, createProject } = useProjects(authUser?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<any>("chat");

  const filtered = projects.filter(p =>
    !p.archived && p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName("");
      setShowNewInput(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        mode={mode}
        setMode={setMode}
        profileName={authUser?.name || ""}
        lang="en"
        onNewConversation={() => router.push("/chat")}
        onOpenSettings={() => {}}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        isLoggedIn={!!authUser}
        isMobile={isMobile}
        authUser={authUser}
        projects={projects}
      />

      <main style={{
        flex: 1,
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        minWidth: 0,
        overflowY: "auto",
        marginLeft: isMobile ? 0 : (sidebarOpen ? 260 : 56),
        transition: "margin-left 200ms ease",
      }}>
        <div style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: isMobile ? "24px 16px 64px" : "40px 32px 80px",
        }}>
          {/* Auth gate — guests see sign-in prompt */}
          {!authUser ? (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "100px 20px",
              borderRadius: 16,
              border: "1px dashed var(--border-secondary)",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                <Lock size={24} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
              </div>
              <h3 style={{
                fontSize: 20, fontWeight: 600, color: "var(--text-primary)",
                marginBottom: 8, marginTop: 0,
              }}>Sign in to use Projects</h3>
              <p style={{
                fontSize: 13, color: "var(--text-tertiary)",
                marginBottom: 24, textAlign: "center", maxWidth: 340,
              }}>
                Organize your analyses, simulations, and intel reports into projects. Sign in to get started.
              </p>
              <button
                onClick={() => { window.location.href = "/login"; }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 28px", borderRadius: 10,
                  background: "var(--accent)",
                  border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, color: "#000",
                  transition: "all 150ms",
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 20px rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                Sign in
              </button>
            </div>
          ) : (
            <>
          <PageHeader
            eyebrow="Workspace"
            title="Projects"
            subtitle="Organize your analyses and simulations."
            actions={
              <button
                onClick={() => setShowNewInput(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 7,
                  background: "rgba(255,255,255,0.08)",
                  border: "none", cursor: "pointer",
                  fontSize: 12.5, fontWeight: 500, color: "#E4E4E7",
                  transition: "background 180ms ease-out",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              >
                <Plus size={14} strokeWidth={1.5} />
                New Project
              </button>
            }
          />

          {/* New project inline input */}
          {showNewInput && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12,
              background: "var(--card-bg)",
              border: "1px solid rgba(255,255,255,0.1)",
              marginBottom: 20,
            }}>
              <input
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setShowNewInput(false); setNewProjectName(""); }
                }}
                placeholder="Project name..."
                style={{
                  flex: 1, border: "none", background: "transparent",
                  color: "var(--text-primary)", fontSize: 14,
                  outline: "none", fontFamily: "var(--font-body)",
                }}
              />
              <button
                onClick={handleCreate}
                style={{
                  padding: "6px 14px", borderRadius: 6,
                  background: "var(--accent)", border: "none",
                  color: "#000", fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                }}
              >Create</button>
              <button
                onClick={() => { setShowNewInput(false); setNewProjectName(""); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-tertiary)", padding: 4,
                }}
              >Cancel</button>
            </div>
          )}

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 10,
            background: "var(--card-bg)",
            border: "1px solid var(--border-secondary)",
            marginBottom: 32,
          }}>
            <Search size={16} style={{ color: "var(--text-tertiary)" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              style={{
                flex: 1, border: "none", background: "transparent",
                color: "var(--text-primary)", fontSize: 14,
                outline: "none", fontFamily: "var(--font-body)",
              }}
            />
          </div>

          {/* Empty state OR Grid */}
          {filtered.length === 0 && !searchQuery ? (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "80px 20px",
              borderRadius: 16,
              border: "1px dashed var(--border-secondary)",
            }}>
              <Folder size={48} strokeWidth={1} style={{
                color: "var(--text-tertiary)", opacity: 0.4,
                marginBottom: 16,
              }} />
              <h3 style={{
                fontSize: 18, fontWeight: 600, color: "var(--text-primary)",
                marginBottom: 6, marginTop: 0,
              }}>No projects yet</h3>
              <p style={{
                fontSize: 13, color: "var(--text-tertiary)",
                marginBottom: 20, textAlign: "center", maxWidth: 300,
              }}>
                Create a project to organize your analyses, simulations, and intel reports.
              </p>
              <button
                onClick={() => setShowNewInput(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-secondary)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                <Plus size={14} />
                Create your first project
              </button>
            </div>
          ) : filtered.length === 0 && searchQuery ? (
            <div style={{
              padding: "60px 20px", textAlign: "center",
              color: "var(--text-tertiary)", fontSize: 14,
            }}>
              No projects matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}>
              {filtered.map(project => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/chat?project=${project.id}`)}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-secondary)",
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border-secondary)";
                    e.currentTarget.style.background = "var(--card-bg)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${project.color || "#C8A84E"}10`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Folder size={16} style={{ color: project.color || "var(--accent)" }} />
                    </div>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, marginTop: 0 }}>{project.name}</h3>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
                    {project.conversation_count || 0} conversations
                  </p>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
