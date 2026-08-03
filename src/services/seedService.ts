import { db, collection, getDocs, addDoc } from '../firebase';
import { INITIAL_CLIENTS, STORAGE_DESTINATIONS, RECENT_BACKUPS } from '../constants';

let isSeedingInProgress = false;

export async function seedInitialDataIfEmpty() {
  if (isSeedingInProgress) return;
  isSeedingInProgress = true;

  try {
    // 1. Check Clients
    const clientsRef = collection(db, 'clients');
    const clientsSnapshot = await getDocs(clientsRef);

    if (clientsSnapshot.empty) {
      console.log('🌱 Base de dados de clientes vazia. Inserindo clientes iniciais...');
      for (const c of INITIAL_CLIENTS) {
        await addDoc(clientsRef, {
          name: c.name,
          createdAt: c.createdAt || new Date().toISOString(),
        });
      }
    }

    // 2. Check Destinations
    const destsRef = collection(db, 'destinations');
    const destsSnapshot = await getDocs(destsRef);

    if (destsSnapshot.empty) {
      console.log('🌱 Inserindo destinos de armazenamento iniciais...');
      for (const d of STORAGE_DESTINATIONS) {
        await addDoc(destsRef, {
          name: d.name,
          client: d.client,
          freeSpaceTB: d.freeSpaceTB,
          usedSpaceTB: d.usedSpaceTB,
          totalSpaceTB: d.totalSpaceTB,
          savingsPercent: d.savingsPercent,
          savingsTB: d.savingsTB,
          backupsCount: d.backupsCount,
          location: d.location,
        });
      }
    }

    // 3. Check Backup Types
    const typesRef = collection(db, 'backup_types');
    const typesSnapshot = await getDocs(typesRef);

    if (typesSnapshot.empty) {
      console.log('🌱 Inserindo tipos de backup iniciais...');
      const defaultTypes = ['Rotina', 'Nuvem / Cloud', 'Local / Imutável', 'VMware', 'Banco de Dados'];
      for (const typeName of defaultTypes) {
        await addDoc(typesRef, { name: typeName });
      }
    }

    // 4. Check Backups
    const backupsRef = collection(db, 'backups');
    const backupsSnapshot = await getDocs(backupsRef);

    if (backupsSnapshot.empty) {
      console.log('🌱 Inserindo registros de backup iniciais...');
      for (const b of RECENT_BACKUPS) {
        await addDoc(backupsRef, {
          client: b.client,
          title: b.title,
          status: b.status,
          category: b.category,
          timestamp: b.timestamp,
          responsible: b.responsible,
        });
      }
    }
  } catch (error) {
    console.error('Erro ao popular dados iniciais no Firestore:', error);
  } finally {
    isSeedingInProgress = false;
  }
}

export async function forceRestoreDefaultClients() {
  const clientsRef = collection(db, 'clients');
  const clientsSnapshot = await getDocs(clientsRef);
  
  const existingNames = new Set(clientsSnapshot.docs.map(doc => doc.data().name?.toLowerCase()));
  let addedCount = 0;

  for (const c of INITIAL_CLIENTS) {
    if (!existingNames.has(c.name.toLowerCase())) {
      await addDoc(clientsRef, {
        name: c.name,
        createdAt: c.createdAt || new Date().toISOString(),
      });
      addedCount++;
    }
  }
  return addedCount;
}
