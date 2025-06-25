"""
Repository abstractions for data persistence.

This module provides interfaces and base classes for implementing
the Repository pattern, which provides an abstraction layer between
the domain model and the data access layer.
"""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, List, Optional, Dict, Any

# Type variable for generic repository
T = TypeVar('T')


class Repository(Generic[T], ABC):
    """
    Base repository interface for data persistence.
    
    This interface defines common operations for repositories,
    such as finding, saving, and deleting entities.
    """
    
    @abstractmethod
    def find_by_id(self, id: str) -> Optional[T]:
        """
        Find an entity by its ID.
        
        Args:
            id: The ID of the entity to find
            
        Returns:
            The entity if found, None otherwise
        """
        pass
    
    @abstractmethod
    def find_all(self) -> List[T]:
        """
        Find all entities.
        
        Returns:
            A list of all entities
        """
        pass
    
    @abstractmethod
    def save(self, entity: T) -> T:
        """
        Save an entity.
        
        Args:
            entity: The entity to save
            
        Returns:
            The saved entity
        """
        pass
    
    @abstractmethod
    def delete(self, id: str) -> bool:
        """
        Delete an entity by its ID.
        
        Args:
            id: The ID of the entity to delete
            
        Returns:
            True if the entity was deleted, False otherwise
        """
        pass


class InMemoryRepository(Repository[T]):
    """
    In-memory implementation of the Repository interface.
    
    This implementation stores entities in memory, which is useful
    for testing and prototyping.
    """
    
    def __init__(self):
        """Initialize an empty repository."""
        self._entities: Dict[str, T] = {}
    
    def find_by_id(self, id: str) -> Optional[T]:
        """
        Find an entity by its ID.
        
        Args:
            id: The ID of the entity to find
            
        Returns:
            The entity if found, None otherwise
        """
        return self._entities.get(id)
    
    def find_all(self) -> List[T]:
        """
        Find all entities.
        
        Returns:
            A list of all entities
        """
        return list(self._entities.values())
    
    def save(self, entity: T) -> T:
        """
        Save an entity.
        
        Args:
            entity: The entity to save
            
        Returns:
            The saved entity
        """
        # Assuming entity has an 'id' attribute
        entity_id = getattr(entity, 'id', None)
        if entity_id is None:
            raise ValueError("Entity must have an 'id' attribute")
        
        self._entities[entity_id] = entity
        return entity
    
    def delete(self, id: str) -> bool:
        """
        Delete an entity by its ID.
        
        Args:
            id: The ID of the entity to delete
            
        Returns:
            True if the entity was deleted, False otherwise
        """
        if id in self._entities:
            del self._entities[id]
            return True
        return False


class FileRepository(Repository[T], ABC):
    """
    File-based implementation of the Repository interface.
    
    This abstract class provides common functionality for file-based
    repositories, such as loading and saving entities to a file.
    """
    
    def __init__(self, file_path: str):
        """
        Initialize a file-based repository.
        
        Args:
            file_path: Path to the file where entities are stored
        """
        self.file_path = file_path
        self._entities: Dict[str, T] = {}
        self._load_entities()
    
    @abstractmethod
    def _load_entities(self) -> None:
        """
        Load entities from the file.
        
        This method should be implemented by subclasses to load
        entities from the file in the appropriate format.
        """
        pass
    
    @abstractmethod
    def _save_entities(self) -> None:
        """
        Save entities to the file.
        
        This method should be implemented by subclasses to save
        entities to the file in the appropriate format.
        """
        pass
    
    def find_by_id(self, id: str) -> Optional[T]:
        """
        Find an entity by its ID.
        
        Args:
            id: The ID of the entity to find
            
        Returns:
            The entity if found, None otherwise
        """
        return self._entities.get(id)
    
    def find_all(self) -> List[T]:
        """
        Find all entities.
        
        Returns:
            A list of all entities
        """
        return list(self._entities.values())
    
    def save(self, entity: T) -> T:
        """
        Save an entity.
        
        Args:
            entity: The entity to save
            
        Returns:
            The saved entity
        """
        # Assuming entity has an 'id' attribute
        entity_id = getattr(entity, 'id', None)
        if entity_id is None:
            raise ValueError("Entity must have an 'id' attribute")
        
        self._entities[entity_id] = entity
        self._save_entities()
        return entity
    
    def delete(self, id: str) -> bool:
        """
        Delete an entity by its ID.
        
        Args:
            id: The ID of the entity to delete
            
        Returns:
            True if the entity was deleted, False otherwise
        """
        if id in self._entities:
            del self._entities[id]
            self._save_entities()
            return True
        return False
