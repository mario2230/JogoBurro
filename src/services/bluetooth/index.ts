import { Capacitor } from '@capacitor/core';
import { BleAnfitriao } from './ble-anfitriao';
import { BleConvidado } from './ble-convidado';
import { SimuladorAnfitriao, SimuladorConvidado } from './simulador';
import type { TransporteAnfitriao, TransporteConvidado } from './transporte';

export * from './transporte';
export * from './permissoes';

export const usandoSimulador = () => !Capacitor.isNativePlatform();
export const criarTransporteAnfitriao = (): TransporteAnfitriao => (usandoSimulador() ? new SimuladorAnfitriao() : new BleAnfitriao());
export const criarTransporteConvidado = (): TransporteConvidado => (usandoSimulador() ? new SimuladorConvidado() : new BleConvidado());
