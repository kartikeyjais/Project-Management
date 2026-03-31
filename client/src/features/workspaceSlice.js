import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"; 
import api from "../configs/api"; 

export const fetchWorkspaces = createAsyncThunk('workspace/fetchWorkspaces' ,  async ({getToken} , thunkAPI)=>{
      try{
        const {data} = await api.get('/api/workspaces' , {headers: {Authorization:`Bearer ${await getToken()}`}}); 
        return data.workspaces || []; 
      }catch(error){ 
       console.log(error?.response?.data?.message || error.message); 
       // Better to return a string/serialized error rather than the whole Axios error object
       return thunkAPI.rejectWithValue(error?.response?.data?.message || "Failed to fetch workspaces");
      }  
})

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;
        },
        setCurrentWorkspace: (state, action) => {
            // NOTE: Side effects in reducers are an anti-pattern, but kept here if your app relies on it.
            localStorage.setItem("currentWorkspaceId", action.payload);
            state.currentWorkspace = state.workspaces.find((w) => w.id === action.payload) || null;
        },
        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);
            if (state.currentWorkspace?.id !== action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        updateWorkspace: (state, action) => {
            const index = state.workspaces.findIndex((w) => w.id === action.payload.id);
            if (index !== -1) {
                state.workspaces[index] = action.payload;
            }
            if (state.currentWorkspace?.id === action.payload.id) {
                state.currentWorkspace = action.payload;
            }
        },
        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
            if (state.currentWorkspace?.id === action.payload) {
                state.currentWorkspace = state.workspaces[0] || null; // Reset if deleted
            }
        },
        
        // --- IMMER OPTIMIZED PROJECT/TASK ACTIONS ---
        
        addProject: (state, action) => {
            const workspace = state.workspaces.find((w) => w.id === state.currentWorkspace?.id);
            if (workspace) {
                workspace.projects.push(action.payload);
                state.currentWorkspace = workspace; // Sync current workspace
            }
        },
        addTask: (state, action) => {
            // Assuming payload is the task object containing projectId
            const task = action.payload; 
            const workspace = state.workspaces.find((w) => w.id === state.currentWorkspace?.id);
            
            if (workspace) {
                const project = workspace.projects.find((p) => p.id === task.projectId);
                if (project) {
                    project.tasks.push(task);
                }
                state.currentWorkspace = workspace; // Sync current workspace
            }
        },
        updateTask: (state, action) => {
            // Assuming payload is the updated task object containing projectId
            const updatedTask = action.payload;
            const workspace = state.workspaces.find((w) => w.id === state.currentWorkspace?.id);
            
            if (workspace) {
                const project = workspace.projects.find((p) => p.id === updatedTask.projectId);
                if (project) {
                    const taskIndex = project.tasks.findIndex((t) => t.id === updatedTask.id);
                    if (taskIndex !== -1) {
                        project.tasks[taskIndex] = updatedTask;
                    }
                }
                state.currentWorkspace = workspace; // Sync current workspace
            }
        },
        deleteTask: (state, action) => {
            // Assuming payload is { id: taskId, projectId: projId }
            const { id: taskId, projectId } = action.payload; 
            const workspace = state.workspaces.find((w) => w.id === state.currentWorkspace?.id);
            
            if (workspace) {
                const project = workspace.projects.find((p) => p.id === projectId);
                if (project) {
                    project.tasks = project.tasks.filter((t) => t.id !== taskId);
                }
                state.currentWorkspace = workspace; // Sync current workspace
            }
        }
    },
   extraReducers: (builder)=>{
       builder.addCase(fetchWorkspaces.pending , (state)=>{
         state.loading = true
       });

       builder.addCase(fetchWorkspaces.fulfilled , (state , action)=>{
            state.workspaces = action.payload;
            if(action.payload.length > 0){
                const storedId = localStorage.getItem('currentWorkspaceId');
                if(storedId){
                   // WARNING: If your ID is a UUID string, Number() will return NaN. 
                   // Remove Number() if your IDs are strings!
                   const findWorkspace = action.payload.find((w)=> w.id === Number(storedId) || w.id === storedId);
                   state.currentWorkspace = findWorkspace ? findWorkspace : action.payload[0];
                } else {
                   state.currentWorkspace = action.payload[0]
                }
            }
            state.loading = false;  
       });

        builder.addCase(fetchWorkspaces.rejected , (state)=>{
         state.loading = false
       });
   }    
});

export const { setWorkspaces, setCurrentWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, addProject, addTask, updateTask, deleteTask } = workspaceSlice.actions;
export default workspaceSlice.reducer;