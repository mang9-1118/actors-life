import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TodoItem } from '@/types'

interface TodoState {
  items: TodoItem[]
  addItem: (text: string) => void
  toggleItem: (id: string) => void
  removeItem: (id: string) => void
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (text) =>
        set((state) => ({
          items: [
            ...state.items,
            { id: crypto.randomUUID(), text, done: false, createdAt: Date.now() },
          ],
        })),
      toggleItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
          ),
        })),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    }),
    { name: 'todo-store' },
  ),
)
