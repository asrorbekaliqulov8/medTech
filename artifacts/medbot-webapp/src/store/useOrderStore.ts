import { create } from 'zustand';

type PatientType = 'adult' | 'child' | null;
type Gender = 'male' | 'female' | null;

interface OrderState {
  serviceId: string | null;
  patientType: PatientType;
  patientName: string;
  patientAge: number | '';
  patientGender: Gender;
  childTiming: string | null;
  usesDiaper: boolean | null;
  complaints: string[];
  customComplaint: string;
  deliverySlot: string | null;
  pickupSlot: string | null;
  districtId: string | null;
  latitude: number | null;
  longitude: number | null;
  addressNote: string;
  
  // Actions
  updateField: <K extends keyof Omit<OrderState, 'updateField' | 'reset'>>(field: K, value: OrderState[K]) => void;
  reset: () => void;
}

const initialState = {
  serviceId: null,
  patientType: null,
  patientName: '',
  patientAge: '',
  patientGender: null,
  childTiming: null,
  usesDiaper: null,
  complaints: [],
  customComplaint: '',
  deliverySlot: null,
  pickupSlot: null,
  districtId: null,
  latitude: null,
  longitude: null,
  addressNote: '',
};

export const useOrderStore = create<OrderState>((set) => ({
  ...initialState,
  updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
  reset: () => set(initialState),
}));
