import fs from 'fs';
import path from 'path';

interface Individual {
  genes: number[];
  fitness: number;
}

interface GAState {
  population: Individual[];
  bestSolution: Individual | null;
  generation: number;
  fitnessHistory: number[];
}

class GeneticOptimizer {
  populationSize: number;
  maxGenerations: number;
  crossoverRate: number;
  mutationRate: number;
  elitismCount: number;
  bounds: Record<string, number[]>;
  defaultGenes: number[];
  population: Individual[];
  bestSolution: Individual | null;
  generation: number;
  fitnessHistory: number[];

  constructor() {
    this.populationSize = 20;
    this.maxGenerations = 50;
    this.crossoverRate = 0.8;
    this.mutationRate = 0.1;
    this.elitismCount = 2;

    this.bounds = {
      zero: [0, 0],
      veryShort: [1, 10],
      short: [5, 20],
      medium: [10, 40],
      long: [20, 60],
      veryLong: [30, 120]
    };

    this.defaultGenes = [0, 5, 12, 25, 40, 60];
    this.population = [];
    this.bestSolution = null;
    this.generation = 0;
    this.fitnessHistory = [];
    this.loadState();
  }

  private loadState() {
    const statePath = path.join(__dirname, '..', '..', 'data', 'ga_state.json');
    try {
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as GAState;
        this.population = state.population || [];
        this.bestSolution = state.bestSolution || null;
        this.generation = state.generation || 0;
        this.fitnessHistory = state.fitnessHistory || [];
        console.log(`[GA] Nạp trạng thái thành công, thế hệ ${this.generation}`);
      } else {
        this.initializePopulation();
      }
    } catch (err) {
      console.error('[GA] Lỗi nạp trạng thái, khởi tạo mới:', err);
      this.initializePopulation();
    }
  }

  private saveState() {
    const statePath = path.join(__dirname, '..', '..', 'data', 'ga_state.json');
    try {
      const stateDir = path.dirname(statePath);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }
      const state: GAState = {
        population: this.population,
        bestSolution: this.bestSolution,
        generation: this.generation,
        fitnessHistory: this.fitnessHistory
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('[GA] Lỗi lưu trạng thái:', err);
    }
  }

  private initializePopulation() {
    this.population = [];
    const boundKeys = Object.keys(this.bounds);
    for (let i = 0; i < this.populationSize; i++) {
      const genes = this.defaultGenes.map((_defaultVal, idx) => {
        const boundKey = boundKeys[idx] ?? 'medium';
        const bounds = this.bounds[boundKey] ?? [10, 40];
        const min = bounds[0] ?? 10;
        const max = bounds[1] ?? 40;
        return Math.round(Math.random() * (max - min) + min);
      });
      this.population.push({ genes, fitness: 0 });
    }
    this.evaluatePopulation();
  }

  private evaluatePopulation() {
    for (const individual of this.population) {
      individual.fitness = this.calculateFitness(individual.genes);
    }
    this.population.sort((a, b) => b.fitness - a.fitness);
    
    const topIndividual = this.population[0];
    if (topIndividual && (!this.bestSolution || topIndividual.fitness > (this.bestSolution.fitness ?? 0))) {
      this.bestSolution = { genes: [...topIndividual.genes], fitness: topIndividual.fitness };
    }
    
    if (topIndividual) {
      this.fitnessHistory.push(topIndividual.fitness);
    }
  }

  private calculateFitness(genes: number[]): number {
    const irrigationEvents = genes.filter(g => g > 0).length;
    const totalDuration = genes.reduce((a, b) => a + b, 0);
    const variance = this.calculateVariance(genes);
    
    const score = (irrigationEvents * 10) + (totalDuration * 0.5) - (variance * 0.3);
    return Math.max(0, Math.min(100, score));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  evolve() {
    if (this.generation >= this.maxGenerations) {
      return { converged: true, generation: this.generation };
    }

    const newPopulation: Individual[] = [];

    for (let i = 0; i < this.elitismCount; i++) {
      const individual = this.population[i];
      if (individual) {
        newPopulation.push({ genes: [...individual.genes], fitness: individual.fitness });
      }
    }

    while (newPopulation.length < this.populationSize) {
      const parent1 = this.selectParent();
      const parent2 = this.selectParent();
      
      let child: Individual;
      if (Math.random() < this.crossoverRate) {
        child = this.crossover(parent1, parent2);
      } else {
        child = { genes: [...parent1.genes], fitness: 0 };
      }
      
      if (Math.random() < this.mutationRate) {
        this.mutate(child);
      }
      
      newPopulation.push(child);
    }

    this.population = newPopulation;
    this.evaluatePopulation();
    this.generation++;
    this.saveState();

    return { converged: false, generation: this.generation, bestFitness: this.bestSolution?.fitness };
  }

  private selectParent(): Individual {
    const tournamentSize = 3;
    let best: Individual | null = null;
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIdx = Math.floor(Math.random() * this.population.length);
      const individual = this.population[randomIdx];
      if (individual && (!best || individual.fitness > (best.fitness ?? 0))) {
        best = individual;
      }
    }
    
    return best ?? this.population[0] ?? { genes: [0, 5, 12, 25, 40, 60], fitness: 0 };
  }

  private crossover(parent1: Individual, parent2: Individual): Individual {
    const crossoverPoint = Math.floor(Math.random() * (parent1.genes.length || 1));
    const genes = [
      ...(parent1.genes?.slice(0, crossoverPoint) ?? []),
      ...(parent2.genes?.slice(crossoverPoint) ?? [])
    ];
    return { genes, fitness: 0 };
  }

  private mutate(individual: Individual) {
    const geneIdx = Math.floor(Math.random() * (individual.genes?.length || 1));
    const boundKeys = Object.keys(this.bounds);
    const boundKey = boundKeys[geneIdx] ?? 'medium';
    const bounds = this.bounds[boundKey] ?? [10, 40];
    const min = bounds[0] ?? 10;
    const max = bounds[1] ?? 40;
    individual.genes[geneIdx] = Math.round(Math.random() * (max - min) + min);
  }

  getBestSolution(): number[] {
    return this.bestSolution?.genes || this.defaultGenes;
  }

  getStats() {
    return {
      generation: this.generation,
      maxGenerations: this.maxGenerations,
      bestFitness: this.bestSolution?.fitness || 0,
      populationSize: this.populationSize,
      fitnessHistory: this.fitnessHistory.slice(-20)
    };
  }

  reset() {
    this.generation = 0;
    this.fitnessHistory = [];
    this.bestSolution = null;
    this.initializePopulation();
    this.saveState();
  }
}

export default new GeneticOptimizer();