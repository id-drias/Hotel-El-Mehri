export type BoardType = 'room_only' | 'bb' | 'hb' | 'fb';

export type ReservationRoomInput = {
  room: string; // room slug
  quantity: number;
};

export type ReservationInput = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  checkIn: string; // YYYY-MM-DD, no timezone conversion
  checkOut: string;
  adults: number;
  children: number;
  board: BoardType;
  message?: string;
  rooms: ReservationRoomInput[];
};

export type ReservationResponse = {
  reference: string;
  status: 'pending' | 'confirmed' | 'cancelled';
};
