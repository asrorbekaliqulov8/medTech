import { create } from 'zustand';

type PatientType = 'adult' | 'child' | null;
type Gender = 'male' | 'female' | null;

export interface OrderState {
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
  updateField: (field: string, value: unknown) => void;
  reset: () => void;
}

const initialState = {
  serviceId: null as string | null,
  patientType: null as PatientType,
  patientName: '',
  patientAge: '' as number | '',
  patientGender: null as Gender,
  childTiming: null as string | null,
  usesDiaper: null as boolean | null,
  complaints: [] as string[],
  customComplaint: '',
  deliverySlot: null as string | null,
  pickupSlot: null as string | null,
  districtId: null as string | null,
  latitude: null as number | null,
  longitude: null as number | null,
  addressNote: '',
};

export const useOrderStore = create<OrderState>((set) => ({
  ...initialState,
  updateField: (field: string, value: unknown) => set((state) => ({ ...state, [field]: value })),
  reset: () => set((state) => ({ ...state, ...initialState })),
}));
