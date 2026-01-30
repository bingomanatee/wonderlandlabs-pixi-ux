# Forestry 4.0 🌲

**Modern Reactive State Management with TypeScript-First Design**

Forestry 4.0 is a powerful, type-safe reactive state management library that combines the best of Redux, MobX, and RxJS patterns. Built from the ground up with TypeScript, Immer, and modern JavaScript practices.

## 🚀 Quick Start

```bash
npm install @wonderlandlabs/forestry4
```

```typescript
import { Forest } from '@wonderlandlabs/forestry4';

// Create a custom store by extending Forest
class CounterStore extends Forest<number> {
  constructor(initialValue = 0) {
    super({ value: initialValue });
  }

  increment() {
    this.next(this.value + 1);
  }

  decrement() {
    this.next(this.value - 1);
  }
}

// Use it
const counter = new CounterStore(5);
counter.subscribe(value => console.log('Count:', value));
counter.increment(); // Count: 6
counter.decrement(); // Count: 5
```

## ✨ Key Features

### 🎯 **Subclass-Based Architecture**
No more configuration objects or action creators. Extend `Forest` classes and add methods directly. Get full TypeScript IntelliSense and type safety.

### 🔄 **Reactive by Design**  
Built on RxJS observables with automatic change detection and efficient updates. Only meaningful changes trigger subscriptions.

### 🛡️ **Type-Safe with Zod Integration**
Optional schema validation using Zod ensures your state always matches your types. Catch errors early in development.

### 🌳 **Hierarchical State Management**
Create focused branches of your state tree. Each branch can have its own methods, validation, and lifecycle while staying synchronized with the parent.

### ⚡ **Immutable Updates with Immer**
All state changes use Immer for safe, efficient immutable updates. Mutate drafts naturally while maintaining immutability.

### 🔒 **Transaction Support**
Group multiple state changes into atomic transactions with automatic rollback on validation failures.

## 📖 Core Concepts

### Forest Classes
- **`Forest<T>`**: The main reactive store class for managing state of type `T`
- **Subclassing**: Extend Forest to add custom methods and business logic
- **Unified Architecture**: No separate branch classes - Forest handles both root and branch scenarios

### State Management
- **Immutable Values**: All state is immutable and managed through Immer
- **Reactive Updates**: Automatic change detection with RxJS observables
- **Type Safety**: Full TypeScript support with generic type parameters

### Path-Based Operations
- **Nested Access**: Use dot notation (`'user.profile.name'`) or arrays (`['user', 'profile', 'name']`)
- **Branch Creation**: Create focused sub-stores for specific parts of your state tree
- **Automatic Sync**: Branches stay synchronized with their parent stores

## 🏗️ Basic Usage

### Creating a Simple Store

```typescript
import { Forest } from '@wonderlandlabs/forestry4';
import { z } from 'zod';

interface User {
  name: string;
  email: string;
  age: number;
}

class UserStore extends Forest<User> {
  constructor(user: User) {
    super({
      value: user,
      schema: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0).max(150)
      })
    });
  }

  updateName(name: string) {
    this.mutate(draft => {
      draft.name = name;
    });
  }

  updateEmail(email: string) {
    this.mutate(draft => {
      draft.email = email;
    });
  }

  celebrateBirthday() {
    this.mutate(draft => {
      draft.age += 1;
    });
  }
}

// Usage
const user = new UserStore({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

user.subscribe(userData => {
  console.log('User updated:', userData);
});

user.updateName('Jane Doe');
user.celebrateBirthday();
```

## 🌳 Hierarchical State with Branches

Create focused sub-stores for different parts of your application state:

```typescript
interface AppState {
  user: {
    profile: { name: string; email: string; };
    preferences: { theme: 'light' | 'dark'; notifications: boolean; };
  };
  cart: {
    items: Array<{ id: string; quantity: number; price: number; }>;
    total: number;
  };
}

class UserProfileBranch extends Forest<AppState['user']['profile']> {
  updateName(name: string) {
    this.mutate(draft => { draft.name = name; });
  }

  updateEmail(email: string) {
    this.mutate(draft => { draft.email = email; });
  }
}

class ShoppingCartBranch extends Forest<AppState['cart']> {
  addItem(id: string, quantity: number, price: number) {
    this.mutate(draft => {
      const existing = draft.items.find(item => item.id === id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        draft.items.push({ id, quantity, price });
      }
      draft.total = draft.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    });
  }

  clearCart() {
    this.mutate(draft => {
      draft.items = [];
      draft.total = 0;
    });
  }
}

class AppStore extends Forest<AppState> {
  constructor() {
    super({
      value: {
        user: {
          profile: { name: '', email: '' },
          preferences: { theme: 'light', notifications: true }
        },
        cart: { items: [], total: 0 }
      }
    });
  }

  // Create focused branches
  getUserProfile() {
    return this.$branch<AppState['user']['profile'], UserProfileBranch>(['user', 'profile'], {
      subclass: UserProfileBranch
    });
  }

  getShoppingCart() {
    return this.$branch<AppState['cart'], ShoppingCartBranch>(['cart'], {
      subclass: ShoppingCartBranch
    });
  }
}

// Usage
const app = new AppStore();
const userProfile = app.getUserProfile();
const cart = app.getShoppingCart();

userProfile.updateName('John Doe');
cart.addItem('laptop', 1, 999.99);
```

## 🔒 Transactions

Group multiple state changes into atomic operations with automatic rollback:

```typescript
class BankAccountStore extends Forest<{ balance: number; transactions: string[] }> {
  constructor(initialBalance: number) {
    super({
      value: { balance: initialBalance, transactions: [] },
      tests: (value) => {
        if (value.balance < 0) return 'Balance cannot be negative';
        return null;
      }
    });
  }

  transfer(amount: number, description: string) {
    return this.$transact({
      suspendValidation: true, // Allow temporary negative balance
      action: () => {
        // These changes happen atomically
        this.mutate(draft => {
          draft.balance -= amount;
          draft.transactions.push(`Transfer: ${description} (-$${amount})`);
        });

        // If validation fails here, entire transaction rolls back
        if (this.value.balance < -1000) {
          throw new Error('Transfer would exceed overdraft limit');
        }
      }
    });
  }
}

const account = new BankAccountStore(500);
account.transfer(600, 'Rent payment'); // This would fail and rollback
console.log(account.value.balance); // Still 500 - transaction was rolled back
```

## 🛡️ Validation & Schema

Ensure data integrity with Zod schemas and custom validation:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  roles: z.array(z.enum(['admin', 'user', 'moderator']))
});

class UserStore extends Forest<z.infer<typeof UserSchema>> {
  constructor(user: z.infer<typeof UserSchema>) {
    super({
      value: user,
      schema: UserSchema,
      tests: (value) => {
        // Custom business logic validation
        if (value.roles.includes('admin') && value.age < 18) {
          return 'Admin users must be at least 18 years old';
        }
        return null;
      }
    });
  }

  promoteToAdmin() {
    this.mutate(draft => {
      if (!draft.roles.includes('admin')) {
        draft.roles.push('admin');
      }
    });
    // Validation automatically runs - will fail if user is under 18
  }
}

// This will throw a validation error
try {
  const user = new UserStore({
    name: 'Young User',
    email: 'young@example.com',
    age: 16,
    roles: ['user']
  });
  user.promoteToAdmin(); // Throws: "Admin users must be at least 18 years old"
} catch (error) {
  console.error(error.message);
}
```

## 📚 API Reference

### Forest Constructor

```typescript
class MyStore extends Forest<DataType> {
  constructor() {
    super({
      value: initialValue,        // Required: Initial state
      schema?: ZodSchema,         // Optional: Zod validation schema
      tests?: ValidationFn,       // Optional: Custom validation functions
      name?: string,              // Optional: Store name for debugging
      debug?: boolean             // Optional: Enable debug logging
    });
  }
}
```

### Core Methods

#### `value: DataType` (readonly)
The current state value. Always immutable - use mutation methods to change.

#### `next(newValue: DataType): void`
Replace the entire state with a new value.

#### `mutate(producer: (draft: DataType) => void, path?: Path): void`
Safely mutate state using Immer. Optionally target a specific path.

#### `set(path: Path, value: unknown): void`
Set a value at a specific path in the state tree.

#### `get(path?: Path): unknown`
Get a value from the state tree. Returns entire state if no path provided.

#### `subscribe(listener: (value: DataType) => void): Subscription`
Subscribe to state changes. Returns RxJS subscription.

#### `complete(): void`
Mark the store as complete and prevent further updates.

#### `$transact(options: TransactionOptions): unknown`
Execute multiple state changes atomically with optional validation suspension.

### Branch Methods

#### `$branch<T, S extends Forest<T>>(path: Path, params: BranchParams<T, S>): S`
Create a focused sub-store for a specific part of the state tree.

```typescript
interface BranchParams<T, S> {
  subclass?: new (...args: any[]) => S;  // Custom branch class
  schema?: ZodSchema<T>;                 // Validation schema for branch
  tests?: ValidationFn<T>;               // Custom validation functions
  name?: string;                         // Branch name for debugging
}
```

### Path Types

Paths can be strings with dot notation or arrays:

```typescript
// String paths
store.get('user.profile.name');
store.set('cart.items.0.quantity', 5);

// Array paths
store.get(['user', 'profile', 'name']);
store.set(['cart', 'items', 0, 'quantity'], 5);

// Mixed types in arrays
store.get(['users', userId, 'preferences', 'theme']);
```

## 🎯 Best Practices

### 1. Use TypeScript Interfaces
Define clear interfaces for your state to get full type safety:

```typescript
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoState {
  items: TodoItem[];
  filter: 'all' | 'active' | 'completed';
}

class TodoStore extends Forest<TodoState> {
  // Full type safety throughout your methods
}
```

### 2. Validate with Zod Schemas
Use Zod for runtime type validation:

```typescript
const TodoItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(500),
  completed: z.boolean(),
  createdAt: z.date()
});

const TodoStateSchema = z.object({
  items: z.array(TodoItemSchema),
  filter: z.enum(['all', 'active', 'completed'])
});

class TodoStore extends Forest<TodoState> {
  constructor() {
    super({
      value: { items: [], filter: 'all' },
      schema: TodoStateSchema
    });
  }
}
```

### 3. Use Branches for Complex State
Break down complex state into focused branches:

```typescript
class TodoStore extends Forest<TodoState> {
  getItemsManager() {
    return this.$branch<TodoItem[], TodoItemsBranch>(['items'], {
      subclass: TodoItemsBranch
    });
  }

  getFilterManager() {
    return this.$branch<TodoState['filter']>(['filter'], {});
  }
}
```

### 4. Use Transactions for Complex Operations
Group related state changes into atomic transactions:

```typescript
class ShoppingCartStore extends Forest<CartState> {
  checkout() {
    return this.$transact({
      suspendValidation: true,
      action: () => {
        // Multiple state changes happen atomically
        this.mutate(draft => {
          draft.status = 'processing';
          draft.items.forEach(item => item.reserved = true);
        });

        // Validate final state
        if (this.value.items.length === 0) {
          throw new Error('Cannot checkout empty cart');
        }

        this.mutate(draft => {
          draft.status = 'completed';
          draft.completedAt = new Date();
        });
      }
    });
  }
}
```

### 5. Handle Errors Gracefully
Use proper error handling and validation:

```typescript
class UserStore extends Forest<User> {
  updateEmail(email: string) {
    try {
      this.mutate(draft => {
        draft.email = email;
      });
    } catch (error) {
      // Handle validation errors
      console.error('Failed to update email:', error.message);
      throw error; // Re-throw if needed
    }
  }
}
```

## 🚀 Advanced Features

### Custom Validation Functions

Beyond Zod schemas, you can define custom validation logic:

```typescript
class InventoryStore extends Forest<InventoryState> {
  constructor() {
    super({
      value: { items: [], totalValue: 0 },
      tests: (value) => {
        // Custom business logic validation
        const calculatedTotal = value.items.reduce((sum, item) => sum + item.value, 0);
        if (Math.abs(value.totalValue - calculatedTotal) > 0.01) {
          return 'Total value must match sum of item values';
        }

        // Check for duplicate SKUs
        const skus = value.items.map(item => item.sku);
        if (new Set(skus).size !== skus.length) {
          return 'Duplicate SKUs are not allowed';
        }

        return null; // Valid
      }
    });
  }
}
```

### Transaction Stack Monitoring

Monitor transaction execution for debugging and analytics:

```typescript
class AnalyticsStore extends Forest<AnalyticsState> {
  constructor() {
    super({ value: { events: [], metrics: {} } });

    // Monitor all transactions
    this.observeTransStack((stack) => {
      console.log('Transaction stack depth:', stack.length);
      stack.forEach((transaction, index) => {
        console.log(`Transaction ${index}:`, transaction.id);
      });
    });
  }
}
```

## 🔧 Migration Guide

### From Forestry 3.x to 4.0

Forestry 4.0 introduces a major architectural change from action-based to subclassing approach:

#### Before (Action-Based)
```typescript
const store = new Forest({
  value: { count: 0 },
  actions: {
    increment: (value) => ({ ...value, count: value.count + 1 }),
    add: (value, amount) => ({ ...value, count: value.count + amount })
  }
});

store.$.increment(); // Called via .$ property
store.acts.add(5);   // Called via .acts property
```

#### After (Subclassing)
```typescript
class CounterStore extends Forest<{ count: number }> {
  constructor() {
    super({ value: { count: 0 } });
  }

  increment() {
    this.mutate(draft => { draft.count += 1; });
  }

  add(amount: number) {
    this.mutate(draft => { draft.count += amount; });
  }
}

const store = new CounterStore();
store.increment(); // Direct method call
store.add(5);      // Direct method call
```

### Benefits of the New Approach

1. **🎯 Direct Method Calls**: No more `.$ ` or `.acts` - call methods directly
2. **🛡️ Better TypeScript Support**: Full IntelliSense and type safety
3. **🏗️ Cleaner Architecture**: Methods are part of class definition
4. **🧪 Easier Testing**: Test methods directly without transformation complexity
5. **📈 Better Performance**: No action transformation overhead

## 🌟 Why Choose Forestry 4.0?

### **🎯 Focused on Developer Experience**
- **TypeScript-First**: Built with TypeScript from the ground up
- **IntelliSense Support**: Full autocomplete and type checking
- **Familiar Patterns**: Standard OOP with classes and methods

### **⚡ Performance Optimized**
- **Efficient Updates**: Only meaningful changes trigger subscriptions
- **Immer Integration**: Fast, safe immutable updates
- **Minimal Overhead**: No action transformation or proxy layers

### **🛡️ Production Ready**
- **Battle Tested**: Used in production applications
- **Comprehensive Testing**: 54+ test cases covering all scenarios
- **Error Handling**: Graceful error recovery and transaction rollback

### **🔧 Flexible Architecture**
- **Start Simple**: Use as a basic reactive store
- **Scale Complex**: Add branches, validation, and transactions as needed
- **Framework Agnostic**: Works with React, Vue, Angular, or vanilla JS

## 📦 Installation & Setup

```bash
# Install Forestry 4.0
npm install @wonderlandlabs/forestry4

# Install peer dependencies
npm install rxjs immer zod
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [Wonderland Labs](https://wonderlandlabs.com)

---

**Ready to get started?** Check out our [examples](./src/examples/) or dive into the [API documentation](./docs/api.md).

**Questions?** Open an issue on [GitHub](https://github.com/bingomanatee/wonderlandlabs-monorepo/issues) or join our [Discord community](https://discord.gg/wonderlandlabs).
