import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);

  const fetchProjects = useCallback(async () => {
    const res = await api.get('/projects');
    setProjects(res.data);
    return res.data;
  }, []);

  const selectProject = useCallback((project) => {
    setCurrentProject(project);
    localStorage.setItem('lastProjectId', project.id);
  }, []);

  return (
    <ProjectContext.Provider value={{ currentProject, projects, setProjects, fetchProjects, selectProject, setCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};
