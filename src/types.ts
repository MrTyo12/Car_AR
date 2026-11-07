export interface VehicleProfile {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  engine: string;
  transmission: string;
  horsepower: number;
  torque_lbft: number;
  mileage: number;
  vin: string;
  color: string;
  purchase_date: string;
  updated_at: string;
}

export interface MaintenanceLog {
  id: string;
  log_date: string;
  mileage: number;
  service_type: string;
  description: string;
  cost: number;
  created_at: string;
}

export interface ActiveUpgrade {
  id: string;
  name: string;
  category: string;
  status: string;
  install_date: string | null;
  notes: string;
  created_at: string;
}

export interface UpcomingService {
  id: string;
  item: string;
  due_mileage: number | null;
  due_date: string | null;
  priority: string;
  notes: string;
  completed: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  difficulty: number;
  est_hours: number;
  parts_cost: number;
  shop_labor_cost: number;
  status: string;
  description: string;
  created_at: string;
}

export interface ProjectStep {
  id: string;
  project_id: string;
  description: string;
  fastener_info: string;
  torque_spec: string;
  tools_required: string;
  completed: boolean;
  step_order: number;
  created_at: string;
}

export interface PartItem {
  id: string;
  project_id: string | null;
  name: string;
  part_number: string;
  vendor: string;
  price: number;
  quantity: number;
  delivery_status: string;
  notes: string;
  created_at: string;
}

export interface ToolItem {
  id: string;
  name: string;
  category: string;
  owned: boolean;
  notes: string;
  created_at: string;
}

export interface MediaTutorial {
  id: string;
  title: string;
  url: string;
  type: string;
  description: string;
  created_at: string;
}

export type ProjectWithSteps = Project & { steps: ProjectStep[] };
