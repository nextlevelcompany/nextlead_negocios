package com.nextlead.dao;

import com.nextlead.models.Contact;
import com.nextlead.models.Direccion;
import com.nextlead.models.Ubigeo;

import java.util.List;
import java.util.Optional;

public interface ContactDao {
    List<Contact> findAll();
    List<Contact> findAllEmpresas();
    Optional<Contact> findById(Long id);
    Contact save(Contact contact);
    void update(Contact contact);
    void deleteById(Long id);
    void updateStarred(Long id, boolean starred);
    void updateAiActive(Long id, boolean aiActive);
    Optional<Contact> findByPhone(String phone);
    Optional<Contact> findByNumeroDocumento(String numeroDocumento);
    List<Direccion> findAddressesByContactId(Long id);
    List<Contact> findPersonasByEmpresaId(Long empresaId);
    List<Ubigeo> findAllUbigeos();
    long count();
    java.util.Map<String, Object> findPaginated(int page, int size, String search, String tipoPersona, String semaforo);
    java.util.Map<String, Object> findCarteraPaginated(int page, int size, String search, String semaforo, String asignadoFilter, Integer usuarioId, Long trabajadorId, Integer diasMin, Boolean conOportunidades);
    java.util.Map<String, Object> getCarteraStats();
    int assignContacts(List<Long> contactIds, Integer usuarioId, Long trabajadorId);
    int assignBatch(int limit, String semaforo, Integer usuarioId, Long trabajadorId);
    int assignRoundRobin(int limit, String semaforo, List<Long> trabajadorIds, List<Integer> usuarioIds);
    int unassignContacts(List<Long> contactIds);
}
